export interface ModelConfig {
  id: string;
  name: string;
  repoId: string;
  paramCount: string;
  description: string;
  samplePrompt: string;
  sampleResponse: string;
  weightHash: string;
  dummyWeights: number[];
}

export type PipelineStep = 'idle' | 'witness' | 'proving' | 'verifying' | 'verified' | 'failed';

export interface ProofArtifacts {
  proof: {
    pi_a: [string, string, string];
    pi_b: [[string, string], [string, string], [string, string]];
    pi_c: [string, string, string];
    protocol: string;
  };
  publicSignals: string[];
  verificationKey: {
    vk_alpha_1: [string, string, string];
    vk_beta_2: [[string, string], [string, string], [string, string]];
    vk_gamma_2: [[string, string], [string, string], [string, string]];
    vk_delta_2: [[string, string], [string, string], [string, string]];
    IC: [string, string, string][];
  };
}

export interface LogLine {
  id: string;
  timestamp: string;
  type: 'info' | 'success' | 'error' | 'warning' | 'circuit';
  message: string;
}
