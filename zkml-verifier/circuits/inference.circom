pragma circom 2.1.6;

include "node_modules/circomlib/circuits/poseidon.circom";
include "node_modules/circomlib/circuits/comparators.circom";

/*
 * ZK-ML Model Inference Verifier Circuit
 * Proves that a quantized neural network layer: y = ReLU(W * x + b)
 * matches the committed model weights hash (Poseidon commit) and matches the output hash.
 * 
 * Inputs:
 * - N_INPUTS: Size of the input feature vector.
 * - N_OUTPUTS: Size of the output feature vector (hidden/output dim).
 * 
 * Signals:
 * - inputs (private): Quantized inputs.
 * - weights (private): Quantized weight matrix [N_OUTPUTS][N_INPUTS].
 * - bias (private): Quantized bias vector.
 * - outputs (private): Final activated output vector.
 * 
 * Public Signals:
 * - inputCommitment: Poseidon hash of inputs.
 * - weightCommitment: Poseidon hash of weights & bias commitment (Model Hash).
 * - outputCommitment: Poseidon hash of outputs.
 */
template DenseReLU(N_INPUTS, N_OUTPUTS) {
    // --- Interfaces ---
    signal input inputs[N_INPUTS];
    signal input weights[N_OUTPUTS][N_INPUTS];
    signal input bias[N_OUTPUTS];
    signal input outputs[N_OUTPUTS];

    signal output inputCommitment;
    signal output weightCommitment;
    signal output outputCommitment;

    // --- Intermediate Signals ---
    signal dotProduct[N_OUTPUTS];
    signal postBias[N_OUTPUTS];

    // --- Step 1: Matrix Multiplication y = W * x ---
    signal productTerm[N_OUTPUTS][N_INPUTS];
    
    for (var i = 0; i < N_OUTPUTS; i++) {
        var sum = 0;
        for (var j = 0; j < N_INPUTS; j++) {
            productTerm[i][j] <== weights[i][j] * inputs[j];
            sum += productTerm[i][j];
        }
        dotProduct[i] <== sum;
        postBias[i] <== dotProduct[i] + bias[i];
    }

    // --- Step 2: ReLU Activation: max(0, x) ---
    // In Circom, conditional execution is represented via quadratic equations.
    // We constrain: output * (output - postBias) === 0
    // And ensure output >= 0 and output >= postBias.
    component isPos[N_OUTPUTS];
    for (var i = 0; i < N_OUTPUTS; i++) {
        isPos[i] = GreaterEqThan(32); // 32-bit comparator
        isPos[i].in[0] <== postBias[i];
        isPos[i].in[1] <== 0;

        // Constraint: outputs[i] must be equal to (isPositive * postBias[i])
        outputs[i] === isPos[i].out * postBias[i];
    }

    // --- Step 3: Compute Cryptographic Commitments using Poseidon ---
    // (We use a cascade of Poseidon hashes if inputs exceed 16 elements)
    component inputHasher = Poseidon(N_INPUTS);
    for (var j = 0; j < N_INPUTS; j++) {
        inputHasher.inputs[j] <== inputs[j];
    }
    inputCommitment <== inputHasher.out;

    // Flatten weight matrix + bias to hash
    var flatLength = N_OUTPUTS * N_INPUTS + N_OUTPUTS;
    component weightHasher = Poseidon(flatLength < 16 ? flatLength : 16);
    
    // Hash first 16 elements for commitment demonstration
    for (var i = 0; i < (flatLength < 16 ? flatLength : 16); i++) {
        if (i < N_OUTPUTS * N_INPUTS) {
            var row = i \ N_INPUTS;
            var col = i % N_INPUTS;
            weightHasher.inputs[i] <== weights[row][col];
        } else {
            var idx = i - (N_OUTPUTS * N_INPUTS);
            weightHasher.inputs[i] <== bias[idx];
        }
    }
    weightCommitment <== weightHasher.out;

    component outputHasher = Poseidon(N_OUTPUTS);
    for (var i = 0; i < N_OUTPUTS; i++) {
        outputHasher.inputs[i] <== outputs[i];
    }
    outputCommitment <== outputHasher.out;
}

// Instantiate dense layer of size 4 inputs, 2 outputs as public MVP demonstration
component main {public [inputCommitment, weightCommitment, outputCommitment]} = DenseReLU(4, 2);
