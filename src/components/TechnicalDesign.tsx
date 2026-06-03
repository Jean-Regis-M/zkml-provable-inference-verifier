import React from 'react';
import { Shield, BookOpen, Layers, Target, AlertTriangle, Milestone, Cpu, CheckCircle } from 'lucide-react';

export default function TechnicalDesign() {
  return (
    <div className="space-y-8 text-[#1a1a1a]" id="tech-design-doc">
      {/* Document Header */}
      <div className="border-b border-gray-200 pb-5">
        <h1 className="text-2xl font-sans font-semibold text-neutral-900 tracking-tight flex items-center gap-3 uppercase">
          <BookOpen className="h-6 w-6 text-black" />
          Technical Design Document: zkML Provable Inference Verifier
        </h1>
        <p className="text-neutral-500 mt-2 text-sm max-w-3xl leading-relaxed">
          An advanced cryptographic architecture for validating HuggingFace model executions without trusted third parties.
        </p>
      </div>

      {/* 1. Problem Analysis */}
      <section className="bg-white border border-gray-200 rounded-lg p-6 space-y-4 shadow-sm">
        <div className="flex items-center gap-2 text-neutral-900 font-sans font-bold uppercase text-xs tracking-wider border-b border-gray-200 pb-3">
          <Cpu className="text-black h-4 w-4" />
          1. Problem Analysis
        </div>
        <div className="space-y-3 text-neutral-600 text-sm leading-relaxed">
          <p>
            Traditional AI inference model structures rely heavily on absolute, unverified trust in server operators.
            When a user requests a model generation from a provider (e.g., HuggingFace, OpenAI), they receive a raw string or tensor response. 
            However, there are fundamental cryptographic gaps:
          </p>
          <ul className="list-disc list-inside space-y-2 mt-2 pl-2 text-neutral-500">
            <li><strong>Model Spoofing:</strong> The provider claims to evaluate a state-of-the-art 70B parameter model, but executes a fast, low-cost 8B model to save computational expenses.</li>
            <li><strong>Weight Tampering:</strong> Weights can be silently adjusted or optimized to inject targeted bias (e.g., commercial bias, political leanings, or subtle brand placement) without altering the user-visible architecture.</li>
            <li><strong>Replay and Ad-Hoc Forgery:</strong> An adversary can replay a prior execution or completely synthesize a response, framing it as an authentic execution path of a designated model.</li>
            <li><strong>Attack Vectors on Proprietary Data:</strong> Proving execution logs over proprietary fine-tuned weights without disclosing the weights themselves to third parties.</li>
          </ul>
          <p className="pt-2 text-neutral-600">
            <strong>The Solution (zkML):</strong> Zero-Knowledge Machine Learning (zkML) provides a mathematical framework where a prover executing inference can generate a 
            cryptographic non-interactive zero-knowledge proof (zk-SNARK). A third party can verify this proof to guarantee the specific model weights ($W$), 
            and the user input ($x$), were computed deterministically ($y = f(W,x)$) to produce output ($y$), without requiring the verifier to rerun the model or even know the model weights.
          </p>
        </div>
      </section>

      {/* 2. System Architecture */}
      <section className="bg-white border border-gray-200 rounded-lg p-6 space-y-4 shadow-sm">
        <div className="flex items-center gap-2 text-neutral-900 font-sans font-bold uppercase text-xs tracking-wider border-b border-gray-200 pb-3">
          <Layers className="text-black h-4 w-4" />
          2. System Architecture & Information Flow
        </div>
        
        {/* ASCII Architecture Diagram */}
        <div className="bg-[#1a1a1a] p-4 rounded border border-neutral-300 overflow-x-auto opacity-95 shadow-inner">
          <pre className="font-mono text-xs text-green-400 leading-5">
{`+-------------------------------------------------------------+
|                      TRUST BOUNDARY                          |
|                                                             |
|   User Prompt (x)                                           |
|        ↓                                                    |
|  [ INFERENCE ENGINE ] ←----- Pulls model from HuggingFace   |
|        │                        (e.g. Model Weights W)      |
|        ↓                                                    |
|   Generated Output (y)                                      |
|        │                                                    |
|        ↓                                                    |
|  [ WITNESS GENERATOR ] ----> Generates State Trace Vector  |
|                                                             |
+--------│----------------------------------------------------+
          │ (Private Input: W, b, x, y)
          ▼
+-------------------------------------------------------------+
|  [ CIRCOM CIRCUIT ] <====== Compile R1CS Constraint Equations|
|        │                     - y == ReLU(W*x + b)           |
|        │                     - hash(W) == weightCommitment  |
|        ↓                                                    |
|  [ PROOF GENERATOR ] <===== Public Inputs (Commitments of x, y, W)
|        │                                                    |
|        ▼                                                    |
|   cryptographic proof.json + public_signals.json            |
+--------│----------------------------------------------------+
          │
          ▼
+-------------------------------------------------------------+
|                    UNTRUSTED THIRD PARTY                    |
|                                                             |
|  [ VERIFIER ENGINE ] <===== verify pairing e(A,B) == e(α,β) |
|        │                                                    |
|        ▼                                                    |
|   Status: ✅ VALID / ❌ REJECTED                             |
+-------------------------------------------------------------+`}
          </pre>
        </div>

        <div className="space-y-2 text-neutral-600 text-sm leading-relaxed">
          <p className="font-bold text-neutral-800">Detailed Component Breakdown:</p>
          <ul className="list-disc list-inside space-y-1.5 pl-2 text-neutral-500">
            <li><span className="text-neutral-900 font-medium">Inference Engine:</span> Executes standard PyTorch / ONNX graph evaluation on float32 weights. Quantizes parameters mapping to fixed-point space.</li>
            <li><span className="text-neutral-900 font-medium">Witness Generator (Rust):</span> Constructs the full arithmetic circuit witness. Computes intermediate node values and algebraic hashes.</li>
            <li><span className="text-neutral-900 font-medium">Circom Circuit:</span> Contains R1CS (Rank-1 Constraint System) mathematical definitions. Constrains the quantized values to match Poseidon hash digests.</li>
            <li><span className="text-neutral-900 font-medium">Proof Generator (snarkjs / Groth16):</span> Combines witness data with proving key to output SNARK proof variables.</li>
            <li><span className="text-neutral-900 font-medium">Verifier:</span> Executes bilinear pairing checks to evaluate mathematical integrity instantly.</li>
          </ul>
        </div>
      </section>

      {/* 3. ZK Design Decisions */}
      <section className="bg-white border border-gray-200 rounded-lg p-6 space-y-4 shadow-sm">
        <div className="flex items-center gap-2 text-neutral-900 font-sans font-bold uppercase text-xs tracking-wider border-b border-gray-200 pb-3">
          <Cpu className="text-black h-4 w-4" />
          3. Cryptographic Design Evaluation
        </div>
        <div className="space-y-4 text-neutral-600 text-sm">
          <p>
            We analyzed three primary models for proving HuggingFace machine learning inference correctly:
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
            <div className="border border-gray-200 bg-neutral-50 p-4 rounded space-y-2 shadow-sm">
              <div className="font-bold text-neutral-900 text-[10px] tracking-widest uppercase">Option A: Full Neural Network</div>
              <p className="text-xs text-neutral-500 leading-relaxed">Encode the entire multi-billion parameter transformer inside a massive Circom circuit.</p>
              <div className="text-xs text-neutral-500 font-mono pt-1">
                <strong>Complexity:</strong> 10B+ constraints<br />
                <strong>Proving Time:</strong> Hours/Days<br />
                <strong>Verdict:</strong> Impractical on current hardware.
              </div>
            </div>

            <div className="border border-gray-250 bg-neutral-50 p-4 rounded space-y-2 shadow-sm">
              <div className="font-bold text-neutral-900 text-[10px] tracking-widest uppercase">Option B: Single Block Proving</div>
              <p className="text-xs text-neutral-500 leading-relaxed">Prove a single key transformer layer block (attention or MLP dense weights) as an index proof.</p>
              <div className="text-xs text-neutral-500 font-mono pt-1">
                <strong>Complexity:</strong> 5M - 50M constraints<br />
                <strong>Proving Time:</strong> 5 - 15 minutes<br />
                <strong>Verdict:</strong> Highly cohesive, research standard.
              </div>
            </div>

            <div className="border border-black bg-[#1a1a1a] text-white p-4 rounded space-y-2 shadow-sm">
              <div className="font-bold text-white text-[10px] tracking-widest uppercase">Option C: Model Hash + Trace (Selected)</div>
              <p className="text-xs text-neutral-300 leading-relaxed">Prove model weights commitment via Poseidon. Prove inference accuracy of the activation layers.</p>
              <div className="text-xs text-neutral-400 font-mono pt-1">
                <strong>Complexity:</strong> &lt; 50k constraints<br />
                <strong>Proving Time:</strong> &lt; 15 seconds<br />
                <strong>Verdict:</strong> Great for responsive dashboard MVP!
              </div>
            </div>
          </div>
          
          <p className="text-xs text-neutral-400 italic font-mono pt-1">
            * MVP Selection Justification: Option C allows for immediate, lightning-fast on-chain and in-browser execution, making it the most optimal, responsive, and robust choice for demonstrating the end-to-end cryptographic pipeline.
          </p>
        </div>
      </section>

      {/* 4. Threat Model */}
      <section className="bg-white border border-gray-200 rounded-lg p-6 space-y-4 shadow-sm">
        <div className="flex items-center gap-2 text-neutral-900 font-sans font-bold uppercase text-xs tracking-wider border-b border-gray-200 pb-3">
          <AlertTriangle className="text-black h-4 w-4" />
          4. Threat Model & Security Auditing
        </div>
        <div className="overflow-x-auto border border-gray-200 rounded">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-neutral-500 font-bold uppercase bg-neutral-50 text-[10px] tracking-wider">
                <th className="p-3">Threat vector</th>
                <th className="p-3">Risk severity</th>
                <th className="p-3">Cryptographic mitigation strategy</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-200/80 hover:bg-neutral-50/50">
                <td className="p-3 font-semibold text-neutral-900">Weight Tampering / Model Swap</td>
                <td className="p-3">
                  <span className="text-red-700 bg-red-55 px-2 py-0.5 rounded border border-red-100 font-bold text-[10px] uppercase font-mono">CRITICAL</span>
                </td>
                <td className="p-3 text-neutral-600 leading-relaxed">Weights are forced to match the public commitment (W_commit = Poseidon(W)). If any weight is modified, the hash evaluation inside the circuit fails.</td>
              </tr>
              <tr className="border-b border-gray-200/80 hover:bg-neutral-50/50">
                <td className="p-3 font-semibold text-neutral-900">Output Spoofing</td>
                <td className="p-3">
                  <span className="text-red-700 bg-red-55 px-2 py-0.5 rounded border border-red-100 font-bold text-[10px] uppercase font-mono">HIGH</span>
                </td>
                <td className="p-3 text-neutral-600 leading-relaxed">The output layer is constrained directly to the model math outputs. Prover cannot pass a fake output since the solver validates the math equations.</td>
              </tr>
              <tr className="border-b border-gray-200/80 hover:bg-neutral-50/50">
                <td className="p-3 font-semibold text-neutral-900">Replay Attack</td>
                <td className="p-3">
                  <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-100 font-bold text-[10px] uppercase font-mono">MEDIUM</span>
                </td>
                <td className="p-3 text-neutral-600 leading-relaxed">Include user input parameters and a session salt inside the verified hash commitment input stream, binding the proof to a single session.</td>
              </tr>
              <tr className="border-b border-gray-200/80 hover:bg-neutral-50/50">
                <td className="p-3 font-semibold text-neutral-900">Poisoned Proving Environment</td>
                <td className="p-3">
                  <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-100 font-bold text-[10px] uppercase font-mono">MEDIUM</span>
                </td>
                <td className="p-3 text-neutral-600 leading-relaxed">Run SnarkJS / Groth16 verify check inside sandboxed hardware enclaves (AWS Nitro/TEEs) or directly by standard decentralized on-chain verifier.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 5. Roadmap */}
      <section className="bg-white border border-gray-200 rounded-lg p-6 space-y-4 shadow-sm">
        <div className="flex items-center gap-2 text-neutral-900 font-sans font-bold uppercase text-xs tracking-wider border-b border-gray-200 pb-3">
          <Milestone className="text-black h-4 w-4" />
          5. Project Roadmap & Milestones
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div className="border border-gray-200 p-4 rounded bg-white shadow-sm hover:border-neutral-400 transition-colors">
            <div className="font-bold text-neutral-900 mb-1.5 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider">
              <CheckCircle className="h-4 w-4 text-black shrink-0" /> MS 1: Weight Pull & Hash
            </div>
            <p className="text-neutral-500 leading-relaxed">Build Rust/Python exporters to load models from HuggingFace, quantizing weights to integers & generating Poseidon field commitments.</p>
          </div>

          <div className="border border-gray-200 p-4 rounded bg-white shadow-sm hover:border-neutral-400 transition-colors">
            <div className="font-bold text-neutral-900 mb-1.5 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider">
              <CheckCircle className="h-4 w-4 text-black shrink-0" /> MS 2: Witness Engine
            </div>
            <p className="text-neutral-500 leading-relaxed">Write fully validated forward execution traces capturing all intermediate nodes (ReLU activations, multiplications) to witness arrays.</p>
          </div>

          <div className="border border-gray-200 p-4 rounded bg-white shadow-sm hover:border-neutral-400 transition-colors">
            <div className="font-bold text-neutral-900 mb-1.5 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider">
              <CheckCircle className="h-4 w-4 text-black shrink-0" /> MS 3: Circom Setup
            </div>
            <p className="text-neutral-500 leading-relaxed">Draft densely bound R1CS constraints enforcing correct layer products and mathematical commitments. Ensure fast proving complexity.</p>
          </div>

          <div className="border border-gray-200 p-4 rounded bg-white shadow-sm hover:border-neutral-400 transition-colors">
            <div className="font-bold text-neutral-900 mb-1.5 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider">
              <CheckCircle className="h-4 w-4 text-black shrink-0" /> MS 4: Key Generation
            </div>
            <p className="text-neutral-500 leading-relaxed">Execute Powers of Tau decentralized ceremony, export proving key (pk.json) and verification key (vk.json) using SnarkJS.</p>
          </div>

          <div className="border border-gray-200 p-4 rounded bg-white shadow-sm hover:border-neutral-400 transition-colors">
            <div className="font-bold text-neutral-900 mb-1.5 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider">
              <CheckCircle className="h-4 w-4 text-black shrink-0" /> MS 5: Verifier API
            </div>
            <p className="text-neutral-500 leading-relaxed">Deploy Rust/Solidity verifiers capable of checking pairings checks over BN254 elliptic curves under 250,000 gas limit on EVM networks.</p>
          </div>

          <div className="border border-gray-200 p-4 rounded bg-white shadow-sm hover:border-neutral-400 transition-colors">
            <div className="font-bold text-neutral-900 mb-1.5 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider">
              <CheckCircle className="h-4 w-4 text-black shrink-0" /> MS 6: Web Dashboard
            </div>
            <p className="text-neutral-500 leading-relaxed">Deliver rich interactive UI illustrating pipeline tracing, weight adjustment mechanics, log terminal output, and proof verifications.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
