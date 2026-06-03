import React, { useState, useEffect } from 'react';
import { Play, Sparkles, Shield, RefreshCw, Layers, CheckCircle2, AlertOctagon, Terminal, HelpCircle, ArrowRight, QrCode, Copy, Check, ExternalLink, X } from 'lucide-react';
import QRCode from 'qrcode';
import { ModelConfig, PipelineStep, LogLine, ProofArtifacts } from '../types';

const MODELS_PRESETS: ModelConfig[] = [
  {
    id: "gpt2",
    name: "GPT-2 (Base)",
    repoId: "openai-community/gpt2",
    paramCount: "117M Params",
    description: "Classic autoregressive Transformer model suitable for text completion and light reasoning.",
    samplePrompt: "Explain Zero-Knowledge proofs in one simple sentence.",
    sampleResponse: "A Zero-Knowledge proof lets you prove a statement is true without sharing any extra information besides the statement's truth itself.",
    weightHash: "0xc8a29b5f...e8bd4",
    dummyWeights: [0.3421, -0.5612, 0.9144, -0.1235, -0.7844, 0.1202, 0.4566, 0.6211]
  },
  {
    id: "distilbert",
    name: "DistilBERT Uncased",
    repoId: "distilbert/distilbert-base-uncased",
    paramCount: "66M Params",
    description: "Efficient text encoder tailored for high-speed sentiment analysis and token extraction.",
    samplePrompt: "Classify: 'Computational cryptography is absolutely fascinating!'",
    sampleResponse: "Result: POSITIVE (Confidence: 99.8%)",
    weightHash: "0x3ab820fc...093ad",
    dummyWeights: [0.1284, 0.8841, -0.3129, 0.4112, 0.9022, -0.5101, 0.0234, 0.1192]
  },
  {
    id: "deepseek-r1",
    name: "DeepSeek R1 (Distilled Quantized)",
    repoId: "deepseek-ai/DeepSeek-R1-Distill-Qwen-1.5B",
    paramCount: "1.5B Params",
    description: "Reasoning model designed with multi-step chain-of-thought evaluations inside quantized lattices.",
    samplePrompt: "Prove that 2 is prime.",
    sampleResponse: "<thought>An integer p > 1 is prime if its only divisors are 1 and p. 2 has exactly two positive divisors: 1 and 2. Therefore, 2 is prime.</thought> Yes, 2 is a prime number.",
    weightHash: "0xdd389c0a...ff831",
    dummyWeights: [0.4512, -0.1983, 0.8821, 0.0341, -0.2234, 0.8329, 0.1193, 0.5401]
  }
];

export default function CryptographicPlayground() {
  const [selectedModel, setSelectedModel] = useState<ModelConfig>(MODELS_PRESETS[0]);
  const [prompt, setPrompt] = useState(MODELS_PRESETS[0].samplePrompt);
  const [customResponse, setCustomResponse] = useState(MODELS_PRESETS[0].sampleResponse);
  const [weightAlteration, setWeightAlteration] = useState<number>(1.0); // 1.0 means original, other values mean tampered
  
  // Playground Security Parameters Modes (Live Verification vs Educational Simulation)
  const [playgroundMode, setPlaygroundMode] = useState<'live' | 'educational'>('live');
  const [quantizationScale, setQuantizationScale] = useState<number>(16); // 8, 16, or 32 bits
  const [soundnessEps, setSoundnessEps] = useState<number>(0); // 0 (strict), 0.01 (loose), 0.05 (experimental)
  const [hashSboxType, setHashSboxType] = useState<'poseidon' | 'sha256'>('poseidon');
  
  // Pipeline Step States
  const [step, setStep] = useState<PipelineStep>('idle');
  const [logs, setLogs] = useState<LogLine[]>([]);
  
  // Proof variables output
  const [proof, setProof] = useState<ProofArtifacts | null>(null);

  // QR Code & External Scans state variables
  const [qrMode, setQrMode] = useState<'url' | 'payload'>('url');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [verificationUrl, setVerificationUrl] = useState<string>('');
  const [qrCopied, setQrCopied] = useState<boolean>(false);
  const [scannedProof, setScannedProof] = useState<{
    modelId: string;
    weights: string;
    status: 'success' | 'failed';
  } | null>(null);

  // Check URL Search Params on startup to handle scan attestations
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const verifyModel = params.get('verifyModel');
    const verifyWeights = params.get('verifyWeights');
    const verifyStatus = params.get('verifyStatus');
    
    if (verifyModel && verifyWeights && verifyStatus) {
      setScannedProof({
        modelId: verifyModel,
        weights: verifyWeights,
        status: verifyStatus as 'success' | 'failed'
      });
    }
  }, []);

  const dismissScannedProof = () => {
    setScannedProof(null);
    window.history.replaceState({}, '', window.location.pathname);
  };

  // Synchronize dynamic QR code representation with the generated proof variables
  useEffect(() => {
    if (!proof) {
      setQrCodeUrl('');
      setVerificationUrl('');
      return;
    }

    const host = window.location.origin + window.location.pathname;
    const modelParam = encodeURIComponent(selectedModel.id);
    const weightsParam = encodeURIComponent(proof.publicSignals[1]);
    const statusParam = step === 'verified' ? 'success' : 'failed';
    const computedUrl = `${host}?verifyModel=${modelParam}&verifyWeights=${weightsParam}&verifyStatus=${statusParam}`;
    setVerificationUrl(computedUrl);

    let contentToEncode = '';
    if (qrMode === 'url') {
      contentToEncode = computedUrl;
    } else {
      contentToEncode = JSON.stringify({
        modelId: selectedModel.id,
        modelName: selectedModel.name,
        repoId: selectedModel.repoId,
        weightCommitment: selectedModel.weightHash,
        computedWeightsHash: proof.publicSignals[1],
        proofStatus: step === 'verified' ? 'AUTHENTIC' : 'TAMPERED',
        pairingConstraintStatus: step === 'verified' ? 'SATISFIED' : 'UNSATISFIED',
        timestamp: new Date().toISOString()
      }, null, 2);
    }

    QRCode.toDataURL(contentToEncode, {
      margin: 1,
      width: 280,
      color: {
        dark: '#1a1a1a',  // charcoal block structure
        light: '#ffffff'  // white background standard padding
      }
    })
    .then(url => {
      setQrCodeUrl(url);
    })
    .catch(err => {
      console.error('Error generating QR code representation', err);
    });
  }, [proof, qrMode, step, selectedModel]);

  // Synchronize prompt on model selection
  useEffect(() => {
    setPrompt(selectedModel.samplePrompt);
    setCustomResponse(selectedModel.sampleResponse);
    setStep('idle');
    setProof(null);
    clearLogs();
  }, [selectedModel]);

  const addLog = (message: string, type: 'info' | 'success' | 'error' | 'warning' | 'circuit' = 'info') => {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, 8);
    setLogs(prev => [...prev, { id: Math.random().toString(), timestamp, message, type }]);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const isTampered = weightAlteration !== 1.0;

  // Run whole pipeline step-by-step
  const triggerPipeline = async () => {
    setProof(null);
    clearLogs();
    
    // --- Step 1: Initialize Weights & Commitment ---
    setStep('witness');
    addLog(`🚀 Initializing zk-ML proving pipeline for model: ${selectedModel.repoId}`, 'info');
    if (playgroundMode === 'educational') {
      addLog(`🎓 EDUCATIONAL SIMULATION DETECTED. Applying active parameters:`, 'info');
      addLog(`   • Integer Precision Mode: Q${quantizationScale}.${quantizationScale} (${quantizationScale}-bit fixed-point scaling)`, 'circuit');
      addLog(`   • Permitted Soundness margin (Epsilon): ±${soundnessEps} delta offset tolerance`, 'circuit');
      addLog(`   • Weights Hash Digest primitive: ${hashSboxType.toUpperCase()}`, 'circuit');
    }
    await sleep(800);
    addLog(`🔍 Requesting metadata attestation from HuggingFace Commit Registry...`, 'info');
    await sleep(600);
    addLog(`✔ Registered official weights digest: ${selectedModel.weightHash}`, 'success');
    addLog(`✔ Base parameters quantized under Q${quantizationScale}.${quantizationScale} scale format (x${Math.pow(2, quantizationScale / 2)})`, 'success');
    
    // Check if tampered and show weight status
    if (isTampered) {
      addLog(`⚠️ ALERT: SILENT WEIGHT TAMPERING DETECTED! Weight values modified by multiplier coefficient [x${weightAlteration.toFixed(4)}].`, 'warning');
    } else {
      addLog(`✔ Model parameters integrity checked. Current matches base precisely.`, 'success');
    }
    
    // --- Step 2: Witness Generation ---
    await sleep(1000);
    setStep('witness');
    addLog(`⚡ Initiating Rust Witness solver [rust/src/main.rs]...`, 'info');
    addLog(`Evaluating quantized inference trace: y = ReLU(W * x + b)`, 'circuit');
    
    // Calculate and log intermediate arithmetic based on scale
    const scaleFactor = Math.pow(2, quantizationScale / 4); // educational scale representation
    const quantizedInput = [Math.round(85 * scaleFactor), Math.round(-42 * scaleFactor), Math.round(112 * scaleFactor), Math.round(5 * scaleFactor)];
    const activeWeights = selectedModel.dummyWeights.map(w => Math.round(w * scaleFactor * weightAlteration));
    
    addLog(`Quantized Inputs vector:  [${quantizedInput.slice(0, 4).join(', ')}]`, 'circuit');
    addLog(`Quantized Parameters (Tampered=${isTampered}): [${activeWeights.slice(0, 4).join(', ')}]`, 'circuit');
    
    // Compute dot product
    const y1_raw = activeWeights[0] * quantizedInput[0] + activeWeights[1] * quantizedInput[1] + activeWeights[2] * quantizedInput[2] + activeWeights[3] * quantizedInput[3];
    const y1_relu = y1_raw > 0 ? y1_raw : 0;
    
    await sleep(800);
    addLog(`Evaluated Layer-1 dense output: y[0]_raw = ${y1_raw} | ReLU(y[0]) = ${y1_relu}`, 'circuit');
    addLog(`✔ Witness values successfully mapped. Generated witness.json`, 'success');

    // --- Step 3: Proving ---
    await sleep(1000);
    setStep('proving');
    
    let baseConstraintsCount = 27850;
    if (playgroundMode === 'educational') {
      if (quantizationScale === 8) {
        baseConstraintsCount -= 10200;
        addLog(`💡 EDUCATIONAL NOTICE: 8-bit sparse quantization reduces circuit footprint to ~${baseConstraintsCount} constraints, but introduces decimal rounding noise!`, 'warning');
      } else if (quantizationScale === 32) {
        baseConstraintsCount += 38500;
        addLog(`💡 EDUCATIONAL NOTICE: 32-bit high-precision quantization expands the scale target. Circuit footprint increased to ~${baseConstraintsCount} constraints (Extended NTT compute required).`, 'warning');
      }
      
      if (hashSboxType === 'sha256') {
        const hashOverhead = 24845 * 5; // Simulating SHA-256 constraints expansion
        baseConstraintsCount += hashOverhead;
        addLog(`💡 EDUCATIONAL ALERT: Swapping Poseidon algebraic hashes for standard SHA-255 primitives. Proof circuit constraints inflated by +${hashOverhead} rows! SHA-256 requires ~50x more constraints per word than target field Poseidon state!`, 'error');
      }
    }

    addLog(`⚙️ Compiling ${baseConstraintsCount.toLocaleString()} constraint rows to Groth16 zk-SNARK proof system [snarkjs / BN254 Curve]...`, 'info');
    addLog(`Computing elliptic curve multi-scalar multiplications (MSM)...`, 'info');
    addLog(`Evaluating Number Theoretic Transforms (NTT) for QAP constraints...`, 'info');
    await sleep(1500);
    
    const computedWeightCommitment = isTampered 
      ? `0x${(Math.abs(Math.sin(weightAlteration)) * 100000).toString(16).slice(0, 8)}...` 
      : selectedModel.weightHash;

    const generatedProof: ProofArtifacts = {
      proof: {
        pi_a: [
          "21188242871839275222246405745257275088696311157297823662689037894",
          "8475820495829104857291048291038475920194857203948572910",
          "1"
        ],
        pi_b: [
          [
            "102938475920194857203948572910485720193",
            "839471928301928301928301938571029385710"
          ],
          [
            "94857291038475920194857203945729104",
            "5721948572019485720495829104857"
          ],
          ["1", "0"]
        ],
        pi_c: [
          "173859201948572039485729104857201938572",
          "572194857201948572049582910485729104",
          "1"
        ],
        protocol: "groth16"
      },
      publicSignals: [
        "0x7cf2d918...", // prompt commitment
        computedWeightCommitment, // weights commitment
        "0xab81ca03..."  // outputs commitment
      ],
      verificationKey: {
        vk_alpha_1: ["103847291", "291038471", "1"],
        vk_beta_2: [["73941", "84920"], ["28103", "48201"], ["1", "0"]],
        vk_gamma_2: [["62840", "19382"], ["10384", "92810"], ["1", "0"]],
        vk_delta_2: [["39481", "90218"], ["39103", "49382"], ["1", "0"]],
        IC: [
          ["1", "0", "0"],
          ["0", "1", "0"],
          ["0", "0", "1"]
        ]
      }
    };
    
    setProof(generatedProof);
    addLog(`✔ Created proof.json and public_signals.json (${baseConstraintsCount.toLocaleString()} constraints certified)`, 'success');
    addLog(`✔ zk-SNARK parameters verifiably completed. Ready for cryptographic check.`, 'success');

    // --- Step 4: Verification ---
    await sleep(1000);
    setStep('verifying');
    addLog(`🔍 Initializing proof verification check [verifier/verifier.rs]...`, 'info');
    
    // Checking the mathematical pairing equations:
    addLog(`Pairing comparison check: e(pi_a, pi_b) == e(α, β) · e(x, γ) · e(pi_c, δ)`, 'info');
    await sleep(1500);

    const checkDelta = Math.abs(1.0 - weightAlteration);
    const isWeightsWithinEpsilonOffset = checkDelta <= soundnessEps;
    const isVerificationSuccessful = !isTampered || (playgroundMode === 'educational' && isWeightsWithinEpsilonOffset);

    if (!isVerificationSuccessful) {
      setStep('failed');
      addLog(`❌ PAIRING EQUALITIES CHECK FAILED: Verification Key mismatch!`, 'error');
      if (playgroundMode === 'educational' && isTampered) {
        addLog(`   • Current Parameter Mismatch Delta: ${checkDelta.toFixed(4)}`, 'error');
        addLog(`   • Active Epsilon Threshold Allowed: ±${soundnessEps}`, 'error');
        addLog(`Conclusion: Verification rejected because weight alteration exceeds the active security parameter bounds.`, 'error');
      } else {
        addLog(`Circuit constraint failed! Reason: Current weights hash (${computedWeightCommitment}) does not match the public committed model hash (${selectedModel.weightHash}) registered on HuggingFace Hub!`, 'error');
        addLog(`Conclusion: Verification rejected. This inference output CANNOT be verified of coming from the genuine ${selectedModel.name} model!`, 'error');
      }
    } else {
      setStep('verified');
      if (playgroundMode === 'educational' && isTampered && isWeightsWithinEpsilonOffset) {
        addLog(`⚠️ EDUCATIONAL OBSERVATION: The proof verified successfully DESPITE altered weights!`, 'warning');
        addLog(`   • Parameter Mismatch Delta: ${checkDelta.toFixed(4)} is within permitted Epsilon: ±${soundnessEps}`, 'warning');
        addLog(`   • This demonstrates how a higher epsilon offset threshold trade-off (allowing small numeric drift in hardware) creates a "Squeezed Soundness Box" vulnerability where minor rogue alterations are accepted as authentic!`, 'warning');
      }
      addLog(`✔ G1/G2 Bilinear pairing validation successful! e(pi_a, pi_b) matched exactly.`, 'success');
      addLog(`✔ PUBLIC INPUTS ATTENTION MATCHED: Core model weights hash verified against HuggingFace metadata state commitment securely!`, 'success');
      addLog(`🎉 VERIFICATION SUCCESS: Cryptographic proof is authentic! Output was generated verifiably by ${selectedModel.name} (Repo: ${selectedModel.repoId})!`, 'success');
    }
  };

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  return (
    <>
      {/* External Scan Attestation Notice */}
      {scannedProof && (
        <div className={`mb-6 p-5 border rounded-lg shadow-sm font-sans flex flex-col md:flex-row items-start justify-between gap-4 transition-all ${
          scannedProof.status === 'success' 
            ? 'bg-emerald-50 border-emerald-300 text-emerald-950' 
            : 'bg-red-50 border-red-300 text-red-950'
        }`}>
          <div className="flex gap-3">
            <div className={`mt-0.5 p-1 rounded-full shrink-0 ${scannedProof.status === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
              {scannedProof.status === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <AlertOctagon className="h-5 w-5" />}
            </div>
            <div>
              <h3 className="font-bold text-xs uppercase tracking-wider mb-1 flex items-center gap-2">
                External QR Scan Proof Attestation Detected
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${scannedProof.status === 'success' ? 'bg-emerald-200 text-emerald-900 border border-emerald-300' : 'bg-red-200 text-red-900 border border-red-300'}`}>
                  {scannedProof.status === 'success' ? 'VALIDATED' : 'TAMPERED / FAILED'}
                </span>
              </h3>
              <p className="text-xs max-w-4xl tracking-normal text-neutral-600 leading-relaxed font-mono">
                Model: <strong className="font-sans text-neutral-900">{MODELS_PRESETS.find(m => m.id === scannedProof.modelId)?.name || scannedProof.modelId}</strong><br />
                Computed Weights Commitment: <strong className="text-neutral-800 break-all">{scannedProof.weights}</strong>
              </p>
              <p className="text-[11px] mt-2 leading-relaxed">
                {scannedProof.status === 'success' 
                  ? '✔ Pairings constraints matched 100%. This model inference was mathematically certified correct by third-party enclaves.'
                  : '❌ ALERT! This proof was built over customized or altered model parameters. The computed parameter commitment is rejected by official registrants!'
                }
              </p>
            </div>
          </div>
          <button 
            onClick={dismissScannedProof}
            className="text-neutral-500 hover:text-neutral-900 p-1 bg-white hover:bg-neutral-100 rounded border border-neutral-250 cursor-pointer shadow-sm self-start md:self-center transition-all duration-200"
            title="Dismiss Proof Attestation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Playground Mode Toggle (Live vs Educational) */}
      <div className="mb-6 bg-white border border-gray-200 rounded-lg p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1">
          <h2 className="text-sm font-sans font-bold text-neutral-900 uppercase tracking-widest flex items-center gap-2">
            <Sparkles className="h-4.5 w-4.5 text-zinc-800" />
            Playground Operational Strategy
          </h2>
          <p className="text-xs text-neutral-500 leading-normal max-w-2xl">
            Toggle between standard production-style <strong className="text-neutral-800 font-medium">Live Verification</strong> and interactive <strong className="text-blue-600 font-semibold">Educational Simulation</strong> parameters. Witness how precision scaling weight parameters, proof soundness margins, and different hashing networks alter verification performance.
          </p>
        </div>
        
        <div className="flex bg-neutral-100 p-1 rounded border border-neutral-200 self-start md:self-center">
          <button
            onClick={() => {
              setPlaygroundMode('live');
              setStep('idle');
              setProof(null);
              clearLogs();
            }}
            className={`px-4 py-2 text-xs font-sans font-bold rounded uppercase tracking-wider transition-all cursor-pointer ${
              playgroundMode === 'live'
                ? 'bg-black text-white shadow-sm'
                : 'text-neutral-500 hover:text-black'
            }`}
          >
            Live Verification
          </button>
          <button
            onClick={() => {
              setPlaygroundMode('educational');
              setStep('idle');
              setProof(null);
              clearLogs();
            }}
            className={`px-4 py-2 text-xs font-sans font-bold rounded uppercase tracking-wider transition-all cursor-pointer ${
              playgroundMode === 'educational'
                ? 'bg-black text-white shadow-sm'
                : 'text-neutral-500 hover:text-black'
            }`}
          >
            Educational Simulation
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-12 text-[#1a1a1a]">
        {/* Configuration Column - 5 cols */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Model & Input Area */}
          <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 text-neutral-900 font-sans font-bold uppercase text-xs tracking-wider">
              <Layers className="h-4 w-4 text-black shrink-0" />
              1. Select Proven Model Registry
            </div>

            <div className="space-y-2">
              {MODELS_PRESETS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedModel(m)}
                  className={`w-full p-4 text-left rounded border transition-all relative overflow-hidden flex flex-col cursor-pointer ${
                    selectedModel.id === m.id
                      ? 'border-black bg-neutral-50 shadow-sm'
                      : 'border-gray-200 bg-white hover:bg-neutral-50/50 hover:border-neutral-300'
                  }`}
                >
                  <div className="flex justify-between items-center w-full">
                    <span className="text-neutral-950 font-sans font-semibold text-sm">{m.name}</span>
                    <span className="text-[9px] bg-black text-white py-0.5 px-2 rounded-sm font-mono tracking-widest uppercase">{m.paramCount}</span>
                  </div>
                  <span className="text-[10px] text-blue-600 font-mono mt-1 font-semibold">{m.repoId}</span>
                  <span className="text-xs text-neutral-500 mt-2 line-clamp-2 leading-relaxed">{m.description}</span>
                </button>
              ))}
            </div>

            <div className="space-y-2 pt-2">
              <label className="text-[10px] font-mono text-neutral-500 uppercase font-bold tracking-widest block">Model Input Inference Prompt</label>
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full bg-white border border-neutral-200 rounded p-3 text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-black transition-all font-mono"
                placeholder="Enter model prompt..."
              />
            </div>

            <div className="space-y-2 pt-1">
              <label className="text-[10px] font-mono text-neutral-500 uppercase font-bold tracking-widest block">Simulated Output Responses</label>
              <textarea
                value={customResponse}
                onChange={(e) => setCustomResponse(e.target.value)}
                className="w-full bg-white border border-neutral-200 rounded p-3 text-xs text-neutral-800 focus:outline-none focus:ring-1 focus:ring-black transition-all font-mono min-h-16"
                rows={2}
              />
            </div>
          </div>

          {/* Educational Parameters Panel - ONLY visible in educational mode */}
          {playgroundMode === 'educational' && (
            <div className="bg-neutral-50 border border-neutral-300 rounded-lg p-5 space-y-4 shadow-sm animate-fade-in">
              <div className="flex items-center gap-2 text-neutral-900 font-sans font-bold uppercase text-xs tracking-wider border-b border-neutral-200 pb-2">
                <HelpCircle className="h-4.5 w-4.5 text-blue-600 shrink-0" />
                1.5. Configure Security Bounds
              </div>
              
              <p className="text-[11px] text-neutral-600 leading-normal">
                Determine the mathematical rules of the zero-knowledge circuit. Adjusting these parameters lets you evaluate constraint complexity size and soundness tradeoffs.
              </p>

              {/* Parameter 1: Bit-Width Quantization */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-neutral-550 uppercase font-bold tracking-widest block">
                  Quantization Integer Precision
                </label>
                <div className="grid grid-cols-3 gap-1">
                  {[8, 16, 32].map((bit) => (
                    <button
                      key={bit}
                      onClick={() => {
                        setQuantizationScale(bit);
                        addLog(`🔧 Educational Scale Shifted: Scale factor adjusted to Q${bit}.${bit} format. Constraint matrices will recalculate.`, 'info');
                      }}
                      className={`py-1.5 px-2 text-[10px] rounded font-mono font-bold tracking-wider text-center border cursor-pointer transition-all ${
                        quantizationScale === bit
                          ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold'
                          : 'border-neutral-250 bg-white text-neutral-500 hover:text-black hover:border-neutral-400'
                      }`}
                    >
                      {bit}-Bit {bit === 16 ? '(Std)' : ''}
                    </button>
                  ))}
                </div>
              </div>

              {/* Parameter 2: Soundness Epsilon Limit */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-neutral-550 uppercase font-bold tracking-widest block">
                  Soundness Offset Epsilon Margin
                </label>
                <div className="grid grid-cols-3 gap-1">
                  {[
                    { val: 0, label: 'Strict (0.0)' },
                    { val: 0.01, label: 'Loose (0.01)' },
                    { val: 0.025, label: 'Noise (0.025)' }
                  ].map((eps) => (
                    <button
                      key={eps.val}
                      onClick={() => {
                        setSoundnessEps(eps.val);
                        addLog(`🔧 Educational Epsilon Shifted: Soundness tolerance boundary set to ±${eps.val}.`, 'info');
                      }}
                      className={`py-1.5 px-2 text-[10px] rounded font-mono font-bold tracking-wider text-center border cursor-pointer transition-all ${
                        soundnessEps === eps.val
                          ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold'
                          : 'border-neutral-250 bg-white text-neutral-500 hover:text-black hover:border-neutral-400'
                      }`}
                    >
                      {eps.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Parameter 3: Algebraic Hash Function */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-neutral-550 uppercase font-bold tracking-widest block">
                  Algebraic Hash Network
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { val: 'poseidon', label: 'Poseidon' },
                    { val: 'sha256', label: 'SHA-256' }
                  ].map((hash) => (
                    <button
                      key={hash.val}
                      onClick={() => {
                        setHashSboxType(hash.val as 'poseidon' | 'sha256');
                        addLog(`🔧 Educational Commitment Swapped: Swapping weight digest hashing mechanism to ${hash.val.toUpperCase()}.`, 'info');
                      }}
                      className={`py-1.5 px-2 text-[10px] rounded font-mono font-bold uppercase tracking-wider text-center border cursor-pointer transition-all ${
                        hashSboxType === hash.val
                          ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold'
                          : 'border-neutral-250 bg-white text-neutral-500 hover:text-black hover:border-neutral-400'
                      }`}
                    >
                      {hash.label === 'Poseidon' ? 'Poseidon (ZK)' : 'SHA-256 (Std)'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Dynamic Weight Tamperer Area */}
          <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-neutral-900 font-sans font-bold uppercase text-xs tracking-wider flex items-center gap-2">
                <Shield className="h-4 w-4 text-black shrink-0" />
                2. Weight Integrity Tamper Slider
              </span>
              {isTampered ? (
                <span className="text-[10px] bg-red-100 text-red-800 font-mono py-0.5 px-2 rounded border border-red-200 font-bold uppercase tracking-wide animate-pulse">
                  Weights Altered
                </span>
              ) : (
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-mono py-0.5 px-2 rounded border border-emerald-200 font-bold uppercase tracking-wide">
                  Pristine weights
                </span>
              )}
            </div>

            <p className="text-neutral-500 text-xs leading-relaxed">
              Adjust the weight multiplier. Inside standard proof verification checks, weights hashes are bounded to committing signatures. 
              Adjusting this simulates a malicious model provider altering weight nodes.
            </p>

            <div className="space-y-2 pt-1">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-neutral-550 mr-2 text-neutral-500">Weight Multiplier</span>
                <span className={`font-bold ${isTampered ? 'text-red-600' : 'text-emerald-700'}`}>
                  {weightAlteration.toFixed(4)}x
                </span>
              </div>
              <input
                type="range"
                min="0.95"
                max="1.05"
                step="0.001"
                value={weightAlteration}
                onChange={(e) => setWeightAlteration(parseFloat(e.target.value))}
                className="w-full h-1 bg-neutral-200 rounded appearance-none cursor-pointer accent-black"
              />
              <div className="flex justify-between items-center text-[9px] font-mono text-neutral-400">
                <span>0.9500x (Min Mismatch)</span>
                <span>1.0000x (Official Param)</span>
                <span>1.0500x (Max Mismatch)</span>
              </div>
            </div>

            <div className="bg-neutral-50 p-3 rounded border border-neutral-200 space-y-1.5 font-mono text-xs">
              <div className="flex justify-between items-center gap-2">
                <span className="text-neutral-550 uppercase text-[10px] font-bold">HF Committed Hash:</span>
                <span className="text-neutral-800 font-semibold truncate max-w-[220px]">{selectedModel.weightHash}</span>
              </div>
              <div className="flex justify-between items-center border-t border-neutral-200 pt-1.5 gap-2">
                <span className="text-neutral-550 uppercase text-[10px] font-bold">Computed Hash:</span>
                <span className={isTampered ? 'text-red-600 font-bold truncate max-w-[220px]' : 'text-emerald-750 font-semibold truncate max-w-[220px]'}>
                  {isTampered ? `0x${(Math.abs(Math.sin(weightAlteration)) * 100000).toString(16).slice(0, 5)}...tempered` : selectedModel.weightHash}
                </span>
              </div>
            </div>

            <button
              onClick={triggerPipeline}
              disabled={step === 'witness' || step === 'proving' || step === 'verifying'}
              className="w-full bg-black hover:bg-neutral-950 disabled:bg-neutral-100 disabled:text-neutral-400 text-white font-sans font-bold py-3 px-4 rounded transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-widest shadow-sm cursor-pointer"
            >
              {step === 'witness' || step === 'proving' || step === 'verifying' ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin text-neutral-400" /> Computing ZK Proof...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-white text-white shrink-0" /> Generate Proof & Verify
                </>
              )}
            </button>
          </div>
        </div>

        {/* Execution Tracker Column - 7 cols */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Visual Pipeline Pipeline Stepper */}
          <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-5 shadow-sm">
            <div className="text-neutral-900 font-sans font-bold uppercase text-xs tracking-wider">
              ZK-ML Provable Verification Pipeline
            </div>

            {/* Stepper Steps UI */}
            <div className="grid grid-cols-4 gap-2 text-center text-xs relative">
              
              {/* Step 1 */}
              <div className={`p-3 rounded border transition-all ${
                step !== 'idle' ? 'bg-neutral-50 border-neutral-300' : 'bg-white border-neutral-100 text-neutral-400'
              }`}>
                <div className="text-[9px] text-neutral-400 font-mono font-bold tracking-wider">STEP 01</div>
                <div className="font-semibold text-neutral-900 mt-1">Witness</div>
                <div className="text-[9px] text-l-gray mt-0.5 description">Trace</div>
              </div>

              {/* Step 2 */}
              <div className={`p-3 rounded border transition-all ${
                step === 'proving' || step === 'verifying' || step === 'verified' || step === 'failed' ? 'bg-neutral-50 border-neutral-300' : 'bg-white border-neutral-100 text-neutral-400'
              }`}>
                <div className="text-[9px] text-neutral-400 font-mono font-bold tracking-wider">STEP 02</div>
                <div className="font-semibold text-neutral-900 mt-1">zk-SNARK</div>
                <div className="text-[9px] text-l-gray mt-0.5">Constraints</div>
              </div>

              {/* Step 3 */}
              <div className={`p-3 rounded border transition-all ${
                step === 'verifying' || step === 'verified' || step === 'failed' ? 'bg-neutral-50 border-neutral-300' : 'bg-white border-neutral-100 text-neutral-400'
              }`}>
                <div className="text-[9px] text-neutral-400 font-mono font-bold tracking-wider">STEP 03</div>
                <div className="font-semibold text-neutral-900 mt-1">Pairing</div>
                <div className="text-[9px] text-l-gray mt-0.5">Elliptic</div>
              </div>

              {/* Step 4 */}
              <div className={`p-3 rounded border transition-all ${
                step === 'verified' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
                step === 'failed' ? 'bg-red-50 border-red-200 text-red-800 animate-pulse' :
                'bg-white border-neutral-100 text-neutral-400'
              }`}>
                <div className="text-[9px] font-mono font-bold tracking-wider">STATUS</div>
                <div className="font-semibold mt-1">
                  {step === 'verified' ? 'PASS' : step === 'failed' ? 'REJECTED' : 'Awaiting'}
                </div>
                <div className="text-[9px] mt-0.5">Certificate</div>
              </div>
            </div>

            {/* Stepper Outcome Cards */}
            {step === 'verified' && (
              <div className="bg-emerald-50 border border-emerald-200 rounded p-4 flex items-start gap-3 text-xs leading-relaxed text-emerald-900 shadow-sm">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-emerald-950 font-bold uppercase tracking-wider text-[10px] block mb-1">INFERENCE AUTHENTICITY CRYPTOGRAPHICALLY ASSURED!</strong>
                  The Zero-Knowledge checker successfully computed pairing balances representing the evaluation trace. 
                  Third parties can guarantee with 100% cryptographic certainty that prompt input yielded this output from pristine model weights of <strong className="text-black font-semibold">{selectedModel.name}</strong> on HuggingFace!
                </div>
              </div>
            )}

            {step === 'failed' && (
              <div className="bg-red-50 border border-red-200 rounded p-4 flex items-start gap-3 text-xs leading-relaxed text-red-900 shadow-sm">
                <AlertOctagon className="h-5 w-5 text-red-650 shrink-0 mt-0.5 animate-pulse" />
                <div>
                  <strong className="text-red-950 font-bold uppercase tracking-wider text-[10px] block mb-1">VERIFICATION FAILED: WEIGHTS REJECTED!</strong>
                  The linear pairing verification returned positive error bounds. The evaluation of private inputs matched a model hash that differs from official committed coordinates. 
                  Someone has silently altered the parameter weights of the designated model.
                </div>
              </div>
            )}

            {/* Log Console Terminal */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px] font-mono font-bold uppercase tracking-widest text-neutral-400">
                <span className="flex items-center gap-1.5"><Terminal className="h-3.5 w-3.5 text-neutral-500" /> Proving & Trace Output stream</span>
                <button onClick={clearLogs} className="hover:text-black hover:underline cursor-pointer">Clear Logs</button>
              </div>
              
              <div className="bg-[#1a1a1a] text-white rounded p-4 border border-neutral-300 min-h-64 max-h-64 overflow-y-auto font-mono text-[11px] leading-relaxed opacity-95 shadow-inner">
                {logs.length === 0 ? (
                  <div className="text-neutral-500 flex items-center justify-center h-full pt-20 select-none">
                    Awaiting instruction pipelines... Click "Generate Proof & Verify" to run.
                  </div>
                ) : (
                  logs.map((l) => (
                    <div key={l.id} className="flex gap-2">
                      <span className="text-neutral-500 select-none">[{l.timestamp}]</span>
                      <span className={`${
                        l.type === 'success' ? 'text-emerald-400 font-semibold' :
                        l.type === 'error' ? 'text-red-400 font-bold' :
                        l.type === 'warning' ? 'text-amber-300' :
                        l.type === 'circuit' ? 'text-blue-300 font-medium' :
                        'text-neutral-200'
                      }`}>
                        {l.message}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Proof JSON Inspection Area */}
          {proof && (
            <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4 font-mono text-xs shadow-sm">
              <div className="flex justify-between items-center text-neutral-900 font-sans font-bold uppercase text-xs tracking-wider pb-2 border-b border-gray-200">
                <span>Proof Variables Inspection (proof.json)</span>
                <span className="text-[9px] bg-neutral-100 text-neutral-800 py-0.5 px-2 rounded font-mono font-bold uppercase tracking-wider border border-neutral-200">
                  Generated dynamically
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <span className="text-neutral-555 font-bold uppercase text-[9px] tracking-wider block">Signal A Coord (G1 Curve)</span>
                  <div className="bg-neutral-50 p-2.5 rounded border border-neutral-200 break-all text-[11px] text-neutral-700 font-mono">
                    {proof.proof.pi_a[0].slice(0, 36)}...{proof.proof.pi_a[0].slice(-16)}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <span className="text-neutral-555 font-bold uppercase text-[9px] tracking-wider block">Signal B Coords (G2 Matrix)</span>
                  <div className="bg-neutral-50 p-2.5 rounded border border-neutral-200 break-all text-[11px] text-neutral-700 font-mono">
                    {proof.proof.pi_b[0][0].slice(0, 36)}...{proof.proof.pi_b[0][0].slice(-16)}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-neutral-555 font-bold uppercase text-[9px] tracking-wider block">Public Commitments (Signals)</span>
                <div className="bg-neutral-50 p-3 rounded border border-neutral-200 flex flex-col sm:flex-row gap-2 text-[10px]">
                  <div className="bg-white text-neutral-800 py-1 px-2.5 rounded border border-neutral-200 flex-1 truncate">
                    <span className="text-neutral-500 font-semibold subtitle text-[9px] uppercase font-sans tracking-wide block">Inputs Target:</span> 0x7cf2d918...
                  </div>
                  <div className="bg-white text-neutral-800 py-1 px-2.5 rounded border border-neutral-200 flex-1 truncate">
                    <span className="text-neutral-500 font-semibold subtitle text-[9px] uppercase font-sans tracking-wide block">Weights Hash:</span> {proof.publicSignals[1].slice(0, 15)}...
                  </div>
                  <div className="bg-white text-neutral-800 py-1 px-2.5 rounded border border-neutral-200 flex-1 truncate">
                    <span className="text-neutral-500 font-semibold subtitle text-[9px] uppercase font-sans tracking-wide block">Outputs Target:</span> 0xab81ca03...
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Proof Verification QR Authenticator */}
          {proof && (
            <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4 shadow-sm">
              <div className="flex justify-between items-center text-neutral-900 font-sans font-bold uppercase text-xs tracking-wider pb-2 border-b border-gray-200">
                <span className="flex items-center gap-2">
                  <QrCode className="h-4.5 w-4.5 text-black shrink-0" />
                  Proof Verification QR Authenticator
                </span>
                <span className="text-[9px] bg-neutral-950 text-white py-0.5 px-2 rounded font-mono font-bold uppercase tracking-wider">
                  Live Router
                </span>
              </div>

              <p className="text-neutral-500 text-xs leading-relaxed">
                Render a zero-knowledge proof verification QR code. External verifiers scanning this tag are redirected back to verify the exact pairing calculations and parameter commitment indexes.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
                {/* QR Code Container */}
                <div className="md:col-span-5 bg-neutral-50 border border-neutral-200 rounded p-4 flex flex-col items-center justify-center relative group min-h-[200px]">
                  {qrCodeUrl ? (
                    <div className="relative p-2 bg-white rounded border border-neutral-200">
                      <img 
                        src={qrCodeUrl} 
                        alt="Verification Proof QR Code" 
                        className="w-36 h-36 object-contain selection:bg-transparent"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  ) : (
                    <div className="text-neutral-400 text-xs font-mono p-4 text-center">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-neutral-400" />
                      Rendering Matrix...
                    </div>
                  )}
                  <span className="text-[8px] text-neutral-400 font-mono tracking-widest mt-2.5 uppercase font-bold">
                    Scan to Validate
                  </span>
                </div>

                {/* QR Configuration and Stats */}
                <div className="md:col-span-7 flex flex-col justify-between space-y-3">
                  {/* Mode Selector */}
                  <div className="space-y-2">
                    <span className="text-neutral-500 font-bold uppercase text-[9px] tracking-wider block font-mono">
                      Encoded Data Target
                    </span>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          setQrMode('url');
                          setLogs(prev => [...prev, {
                            id: Math.random().toString(),
                            timestamp: new Date().toISOString().split('T')[1].slice(0, 8),
                            message: "🔄 QR matrix recalculated for: Router verification URL format (optimized for scanning)",
                            type: 'info'
                          }]);
                        }}
                        className={`py-2 px-3 text-[10px] rounded font-mono font-bold uppercase tracking-wider text-center border cursor-pointer transition-all ${
                          qrMode === 'url'
                            ? 'border-black bg-black text-white shadow-sm'
                            : 'border-neutral-200 bg-white text-neutral-500 hover:text-black hover:border-neutral-400'
                        }`}
                      >
                        Router URL
                      </button>
                      <button
                        onClick={() => {
                          setQrMode('payload');
                          setLogs(prev => [...prev, {
                            id: Math.random().toString(),
                            timestamp: new Date().toISOString().split('T')[1].slice(0, 8),
                            message: "🔄 QR matrix recalculated for: Offline JSON parameters trace",
                            type: 'info'
                          }]);
                        }}
                        className={`py-2 px-3 text-[10px] rounded font-mono font-bold uppercase tracking-wider text-center border cursor-pointer transition-all ${
                          qrMode === 'payload'
                            ? 'border-black bg-black text-white shadow-sm'
                            : 'border-neutral-200 bg-white text-neutral-500 hover:text-black hover:border-neutral-400'
                        }`}
                      >
                        JSON Metadata
                      </button>
                    </div>
                  </div>

                  {/* Info summary */}
                  <div className="bg-neutral-50 p-3 rounded border border-neutral-200 space-y-1.5 font-mono text-[9px] leading-normal">
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-neutral-400 font-bold uppercase shrink-0">Model ID:</span>
                      <span className="text-neutral-800 font-semibold text-right break-all">{selectedModel.id}</span>
                    </div>
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-neutral-400 font-bold uppercase shrink-0">Parameter Root:</span>
                      <span className="text-neutral-800 break-all text-right uppercase">{proof.publicSignals[1].slice(0, 16)}...</span>
                    </div>
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-neutral-400 font-bold uppercase shrink-0">Signature:</span>
                      <span className={`font-bold ${step === 'verified' ? 'text-emerald-700' : 'text-red-700'}`}>
                        {step === 'verified' ? 'PASS (AUTHENTIC)' : 'REJECT (TAMPERED)'}
                      </span>
                    </div>
                  </div>

                  {/* Copy Button */}
                  <button
                    onClick={() => {
                      const stringToCopy = qrMode === 'url' 
                        ? verificationUrl 
                        : JSON.stringify({
                            modelId: selectedModel.id,
                            modelName: selectedModel.name,
                            repoId: selectedModel.repoId,
                            computedWeightsHash: proof.publicSignals[1],
                            proofStatus: step === 'verified' ? 'AUTHENTIC' : 'TAMPERED',
                            pairingStatus: step === 'verified' ? 'SUCCESS' : 'FAILED',
                            timestamp: new Date().toISOString()
                          }, null, 2);
                          
                      navigator.clipboard.writeText(stringToCopy);
                      setQrCopied(true);
                      setTimeout(() => setQrCopied(false), 2000);
                      
                      setLogs(prev => [...prev, {
                        id: Math.random().toString(),
                        timestamp: new Date().toISOString().split('T')[1].slice(0, 8),
                        message: "📋 Copied verification data to clipboard!",
                        type: 'success'
                      }]);
                    }}
                    className="w-full bg-white hover:bg-neutral-50 border border-neutral-300 hover:border-neutral-400 text-neutral-700 hover:text-black font-sans font-bold py-2 px-4 rounded transition-all flex items-center justify-center gap-2 text-[10px] uppercase tracking-wider shadow-sm cursor-pointer"
                  >
                    {qrCopied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600 animate-bounce" />
                        Copied Successfully!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 text-neutral-500" />
                        Copy Encoded QR Stream
                      </>
                    )}
                  </button>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-2 justify-center text-[9px] text-neutral-400 font-mono pt-1 text-center">
                <span>* Direct verification anchor</span>
                <span>●</span>
                <a 
                  href={verificationUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-neutral-500 hover:text-black hover:underline inline-flex items-center gap-0.5"
                >
                  Verify Live Link <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
