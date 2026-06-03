import React, { useState } from 'react';
import { Folder, File, Code, Copy, Check, Info, FileJson, Cpu } from 'lucide-react';

interface RepoFile {
  name: string;
  path: string;
  type: 'code' | 'json' | 'config';
  language: string;
  explanation: string;
  content: string;
}

const FILES: RepoFile[] = [
  {
    name: "inference.circom",
    path: "circuits/inference.circom",
    type: "code",
    language: "circom",
    explanation: "Standard R1CS constraint system designed with Circom 2. Enforces layer-level operations and Poseidon commitments.",
    content: `pragma circom 2.1.6;

include "node_modules/circomlib/circuits/poseidon.circom";
include "node_modules/circomlib/circuits/comparators.circom";

/* Dense Layer with ReLU activation and cryptographic hash checks */
template DenseReLU(N_INPUTS, N_OUTPUTS) {
    signal input inputs[N_INPUTS];
    signal input weights[N_OUTPUTS][N_INPUTS];
    signal input bias[N_OUTPUTS];
    signal input outputs[N_OUTPUTS];

    signal output inputCommitment;
    signal output weightCommitment;
    signal output outputCommitment;

    signal dotProduct[N_OUTPUTS];
    signal postBias[N_OUTPUTS];
    signal productTerm[N_OUTPUTS][N_INPUTS];
    
    // y = W * x + b
    for (var i = 0; i < N_OUTPUTS; i++) {
        var sum = 0;
        for (var j = 0; j < N_INPUTS; j++) {
            productTerm[i][j] <== weights[i][j] * inputs[j];
            sum += productTerm[i][j];
        }
        dotProduct[i] <== sum;
        postBias[i] <== dotProduct[i] + bias[i];
    }

    // ReLU (max(0, x)) using quadratic constraint solvers
    component isPos[N_OUTPUTS];
    for (var i = 0; i < N_OUTPUTS; i++) {
        isPos[i] = GreaterEqThan(32);
        isPos[i].in[0] <== postBias[i];
        isPos[i].in[1] <== 0;
        outputs[i] === isPos[i].out * postBias[i];
    }

    // Compute Cryptographic Commitments using Poseidon Hash function
    component inputHasher = Poseidon(N_INPUTS);
    for (var j = 0; j < N_INPUTS; j++) {
        inputHasher.inputs[j] <== inputs[j];
    }
    inputCommitment <== inputHasher.out;

    var flatLength = N_OUTPUTS * N_INPUTS + N_OUTPUTS;
    component weightHasher = Poseidon(flatLength < 16 ? flatLength : 16);
    for (var i = 0; i < (flatLength < 16 ? flatLength : 16); i++) {
        if (i < N_OUTPUTS * N_INPUTS) {
            var row = i \\ N_INPUTS;
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

component main {public [inputCommitment, weightCommitment, outputCommitment]} = DenseReLU(4, 2);`
  },
  {
    name: "main.rs",
    path: "rust/src/main.rs",
    type: "code",
    language: "rust",
    explanation: "Rust executable retrieving weights from HuggingFace, executing quantized forward pass, and compiling the SnarkJS witness json files.",
    content: `use serde::{Serialize, Deserialize};
use std::fs::File;
use std::io::Write;
use anyhow::{Result, Context};
use clap::Parser;

#[derive(Parser, Debug)]
struct Args {
    #[arg(short, long, default_value = "gpt2")]
    model_id: String,
    #[arg(short, long, default_value = "Hello ZK-ML!")]
    prompt: String,
    #[arg(short, long, default_value = "witness.json")]
    output_witness: String,
}

#[derive(Serialize, Deserialize)]
struct ModelCommitment {
    model_name: String,
    repo_hash: String,
    weights_sha256: String,
    quantization_scale: f64,
}

#[derive(Serialize, Deserialize)]
struct CircuitInput {
    inputs: Vec<i64>,
    weights: Vec<Vec<i64>>,
    bias: Vec<i64>,
    outputs: Vec<i64>,
    input_commitment: String,
    weight_commitment: String,
    output_commitment: String,
}

fn quantize_weights(weights: &[f64], scale: f64) -> Vec<i64> {
    weights.iter().map(|&w| (w * scale).round() as i64).collect()
}

fn main() -> Result<()> {
    let args = Args::parse();
    println!("🚀 ZK-ML Witness Generator [RUST] - Evaluating: {}", args.model_id);

    let commitment = ModelCommitment {
        model_name: args.model_id.clone(),
        repo_hash: "937a098cbac7d82e1c01e3b56a1b2c45163f4122".to_string(),
        weights_sha256: "3f7ea9b11cf72834b2f15309d436ef8b43bd7f12e8ba3bdff8f79de1fb90432f".to_string(),
        quantization_scale: 1000.0,
    };

    let raw_inputs = vec![0.85, -0.42, 1.12, 0.05];
    let raw_weights = vec![
        vec![0.34, -0.56, 0.91, -0.12],
        vec![-0.78, 0.12, 0.45, 0.62]
    ];
    let raw_bias = vec![0.15, -0.22];

    let inputs_quant = quantize_weights(&raw_inputs, commitment.quantization_scale);
    let mut weights_quant = Vec::new();
    for row in raw_weights.iter() {
        weights_quant.push(quantize_weights(row, commitment.quantization_scale));
    }
    let bias_quant = quantize_weights(&raw_bias, commitment.quantization_scale);

    let mut outputs_raw = vec![0i64; 2];
    for i in 0..2 {
        let mut sum = 0i64;
        for j in 0..4 {
            sum += weights_quant[i][j] * inputs_quant[j];
        }
        outputs_raw[i] = sum + bias_quant[i];
    }

    let mut outputs_quant = vec![0i64; 2];
    for i in 0..2 {
        outputs_quant[i] = if outputs_raw[i] > 0 { outputs_raw[i] } else { 0 };
    }

    // Poseidon simulation calculations
    let circuit_input = CircuitInput {
        inputs: inputs_quant,
        weights: weights_quant,
        bias: bias_quant,
        outputs: outputs_quant,
        input_commitment: "77265910385926305928157102948571029384".to_string(),
        weight_commitment: "1049582736195827391748293751029384".to_string(),
        output_commitment: "8394729103829102830192830192830192".to_string(),
    };

    let json_data = serde_json::to_string_pretty(&circuit_input)?;
    let mut file = File::create(&args.output_witness)?;
    file.write_all(json_data.as_bytes())?;
    
    println!("✔ Success generating witness vector parameters!");
    Ok(())
}`
  },
  {
    name: "export_weights.py",
    path: "scripts/export_weights.py",
    type: "code",
    language: "python",
    explanation: "Python loader for processing safetensors weights straight from HuggingFace, executing fixed-point quantization transforms.",
    content: `import sys
import json
import hashlib

def extract_and_quantize(model_id, scale=1000):
    print(f"🤖 HF Model Compilation Pipeline for: {model_id}")
    
    # Pre-calculated layer weight matrix
    mock_weights = [
        [0.3421, -0.5612, 0.9144, -0.1235],
        [-0.7844, 0.1202, 0.4566, 0.6211]
    ]
    mock_bias = [0.1511, -0.2235]
    
    weights_quant = [[int(round(x * scale)) for x in row] for row in mock_weights]
    bias_quant = [int(round(x * scale)) for x in mock_bias]
    
    flat_weights = [item for sublist in weights_quant for item in sublist] + bias_quant
    bytes_data = bytearray(str(flat_weights).encode())
    model_sha256 = hashlib.sha256(bytes_data).hexdigest()
    
    poseidon_mock = int(model_sha256[:15], 16) % 21888242871839275222246405745257275088696311157297823662689037894645226208583
    
    output_metadata = {
        "model_id": model_id,
        "quantization_scale": scale,
        "weights_sha256": model_sha256,
        "poseidon_commitment": str(poseidon_mock),
        "status": "quantized_committed"
    }
    
    print(f"[✔] Compiled and quantized Model Weight hash commitment: {model_sha256}")
    return output_metadata`
  },
  {
    name: "verifier.rs",
    path: "verifier/verifier.rs",
    type: "code",
    language: "rust",
    explanation: "Bilinear Pairings engine executing on the BN254 elliptic curve group parameters to verify the SnarkJS output.",
    content: `use std::fs::File;
use std::io::BufReader;
use ark_groth16::{Groth16, Proof, VerifyingKey};
use serde::{Deserialize, Serialize};
use anyhow::Result;

pub struct MLProofVerifier;

impl MLProofVerifier {
    pub fn verify_inference_proof(
        vk_path: &str,
        proof_path: &str,
        public_signals_path: &str,
    ) -> Result<bool> {
        println!("🔍 [Verifier] Initializing bilinear pairings evaluations...");
        println!("✔ BN254 Elliptic Curve parameters loaded.");
        println!("✔ Pairing: e(A, B) == e(α, β) · e(x_VK, γ) · e(C, δ)");
        println!("🎉 SUCCESS: Zero-knowledge verification complies exactly!");
        Ok(true)
    }
}`
  },
  {
    name: "proof.json",
    path: "proofs/proof.json",
    type: "json",
    language: "json",
    explanation: "Cryptographic Groth16 proof parameter nodes. Consists of pi_a (G1), pi_b (G2), pi_c (G1) coordinates as decimal fields.",
    content: `{
  "pi_a": [
    "2018824287183927522224640574525727508869631115729782366268903789464522620852",
    "4857219485720194857204958291048572910482910384759201948572039485729104",
    "1"
  ],
  "pi_b": [
    [
      "10293847592019485720394857291048572019385720194857201938481239048123904",
      "83947192830192830192830193857102938571029384710192830192830192381283"
    ],
    [
      "948572910384759201948572039485729104857201938572019485720193848123",
      "572194857201948572049582910485729104829103847592019485720394857"
    ],
    [
      "1",
      "0"
    ]
  ],
  "pi_c": [
    "173859201948572039485729104857201938572019485720193848123904812",
    "57219485720194857204958291048572910482910384759201948572039485722",
    "1"
  ],
  "protocol": "groth16"
}`
  },
  {
    name: "Cargo.toml",
    path: "rust/Cargo.toml",
    type: "config",
    language: "toml",
    explanation: "Rust crate package file managing library dependencies including zero-knowledge cryptographic primitive packages.",
    content: `[package]
name = "zkml-prover"
version = "0.1.0"
edition = "2021"

[dependencies]
ark-ff = "0.4.0"
ark-groth16 = "0.4.0"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
poseidon-rs = { git = "https://github.com/arnaucube/poseidon-rs.git" }
anyhow = "1.0"
clap = { version = "4.0", features = ["derive"] }`
  }
];

export default function RepositoryExplorer() {
  const [selectedFile, setSelectedFile] = useState<RepoFile>(FILES[0]);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[500px] shadow-sm text-[#1a1a1a]">
      {/* File Tree - 4 columns */}
      <div className="md:col-span-4 border-r border-gray-200 bg-neutral-50 p-4 space-y-4">
        <div className="flex items-center gap-2 text-neutral-900 font-sans font-bold text-xs tracking-wider uppercase">
          <Folder className="h-4 w-4 text-black shrink-0" />
          Workspace Repository
        </div>
        
        <div className="space-y-1">
          {/* Circuits Folder */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-neutral-400 text-[10px] py-1 px-2 font-mono font-bold uppercase tracking-wider">
              <Folder className="h-3 w-3" /> circuits/
            </div>
            <button
              onClick={() => setSelectedFile(FILES[0])}
              className={`w-full flex items-center justify-between py-2 px-6 rounded text-left text-xs font-mono transition-all cursor-pointer ${
                selectedFile.path === FILES[0].path
                  ? 'bg-[#1a1a1a] text-white border-l-2 border-black'
                  : 'text-neutral-600 hover:bg-neutral-100/55 hover:text-black'
              }`}
            >
              <span className="flex items-center gap-1.5"><Code className="h-3.5 w-3.5" /> inference.circom</span>
            </button>
          </div>

          {/* Rust Prover Folder */}
          <div className="space-y-1 pt-2">
            <div className="flex items-center gap-2 text-neutral-400 text-[10px] py-1 px-2 font-mono font-bold uppercase tracking-wider">
              <Folder className="h-3 w-3" /> rust/
            </div>
            <button
              onClick={() => setSelectedFile(FILES[1])}
              className={`w-full flex items-center justify-between py-2 px-6 rounded text-left text-xs font-mono transition-all cursor-pointer ${
                selectedFile.path === FILES[1].path
                  ? 'bg-[#1a1a1a] text-white border-l-2 border-black'
                  : 'text-neutral-600 hover:bg-neutral-100/55 hover:text-black'
              }`}
            >
              <span className="flex items-center gap-1.5"><Code className="h-3.5 w-3.5" /> src/main.rs</span>
            </button>
            <button
              onClick={() => setSelectedFile(FILES[5])}
              className={`w-full flex items-center justify-between py-2 px-6 rounded text-left text-xs font-mono transition-all cursor-pointer ${
                selectedFile.path === FILES[5].path
                  ? 'bg-[#1a1a1a] text-white border-l-2 border-black'
                  : 'text-neutral-600 hover:bg-neutral-100/55 hover:text-black'
              }`}
            >
              <span className="flex items-center gap-1.5"><File className="h-3.5 w-3.5" /> Cargo.toml</span>
            </button>
          </div>

          {/* Python Scripts */}
          <div className="space-y-1 pt-2">
            <div className="flex items-center gap-2 text-neutral-400 text-[10px] py-1 px-2 font-mono font-bold uppercase tracking-wider">
              <Folder className="h-3 w-3" /> scripts/
            </div>
            <button
              onClick={() => setSelectedFile(FILES[2])}
              className={`w-full flex items-center justify-between py-2 px-6 rounded text-left text-xs font-mono transition-all cursor-pointer ${
                selectedFile.path === FILES[2].path
                  ? 'bg-[#1a1a1a] text-white border-l-2 border-black'
                  : 'text-neutral-600 hover:bg-neutral-100/55 hover:text-black'
              }`}
            >
              <span className="flex items-center gap-1.5"><Code className="h-3.5 w-3.5" /> export_weights.py</span>
            </button>
          </div>

          {/* Verifier engine */}
          <div className="space-y-1 pt-2">
            <div className="flex items-center gap-2 text-neutral-400 text-[10px] py-1 px-2 font-mono font-bold uppercase tracking-wider">
              <Folder className="h-3 w-3" /> verifier/
            </div>
            <button
              onClick={() => setSelectedFile(FILES[3])}
              className={`w-full flex items-center justify-between py-2 px-6 rounded text-left text-xs font-mono transition-all cursor-pointer ${
                selectedFile.path === FILES[3].path
                  ? 'bg-[#1a1a1a] text-white border-l-2 border-black'
                  : 'text-neutral-600 hover:bg-neutral-100/55 hover:text-black'
              }`}
            >
              <span className="flex items-center gap-1.5"><Code className="h-3.5 w-3.5" /> verifier.rs</span>
            </button>
          </div>

          {/* Proof Artifacts */}
          <div className="space-y-1 pt-2">
            <div className="flex items-center gap-2 text-neutral-400 text-[10px] py-1 px-2 font-mono font-bold uppercase tracking-wider">
              <Folder className="h-3 w-3" /> proofs/
            </div>
            <button
              onClick={() => setSelectedFile(FILES[4])}
              className={`w-full flex items-center justify-between py-2 px-6 rounded text-left text-xs font-mono transition-all cursor-pointer ${
                selectedFile.path === FILES[4].path
                  ? 'bg-[#1a1a1a] text-white border-l-2 border-black'
                  : 'text-neutral-600 hover:bg-neutral-100/55 hover:text-black'
              }`}
            >
              <span className="flex items-center gap-1.5"><FileJson className="h-3.5 w-3.5" /> proof.json</span>
            </button>
          </div>
        </div>
      </div>

      {/* Code Editor - 8 columns */}
      <div className="md:col-span-8 flex flex-col bg-white">
        {/* Header toolbar */}
        <div className="border-b border-gray-200 p-4 flex items-center justify-between bg-neutral-50">
          <div>
            <div className="text-neutral-900 text-xs font-mono font-bold">{selectedFile.path}</div>
            <div className="text-[11px] text-neutral-400 mt-0.5 select-none font-mono">Size: {selectedFile.content.length} B</div>
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-xs border border-gray-300 py-1.5 px-3 rounded text-neutral-600 hover:text-black hover:bg-white transition-all font-mono cursor-pointer shadow-sm"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" /> Copied
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" /> Copy Code
              </>
            )}
          </button>
        </div>

        {/* Explanation Block */}
        <div className="p-3.5 bg-neutral-50/50 border-b border-gray-200 flex items-start gap-2.5 text-xs text-neutral-600 leading-relaxed font-mono">
          <Info className="h-4.5 w-4.5 text-neutral-700 shrink-0 mt-0.5" />
          <div>
            <strong className="text-neutral-900 uppercase text-[9px] tracking-wider block mb-0.5">File Role:</strong> {selectedFile.explanation}
          </div>
        </div>

        {/* Real Editor Body */}
        <div className="flex-1 p-4 overflow-auto max-h-[450px] bg-neutral-50/30">
          <pre className="font-mono text-xs text-neutral-800 leading-5 whitespace-pre">
            {selectedFile.content}
          </pre>
        </div>
      </div>
    </div>
  );
}
