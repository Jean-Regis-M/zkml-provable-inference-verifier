import React, { useState } from 'react';
import { Cpu, ShieldCheck, Terminal, Heart, Code2, BookOpen, AlertCircle, FileText } from 'lucide-react';
import CryptographicPlayground from './components/CryptographicPlayground';
import TechnicalDesign from './components/TechnicalDesign';
import RepositoryExplorer from './components/RepositoryExplorer';

type ActiveTab = 'playground' | 'design' | 'repository';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('playground');

  return (
    <div className="min-h-screen bg-[#fdfdfd] text-[#1a1a1a] flex flex-col font-sans selection:bg-neutral-200 selection:text-neutral-950 antialiased">
      {/* Header Bar */}
      <header className="border-b border-neutral-200 bg-[#fdfdfd]/90 backdrop-blur-md sticky top-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Logo / Title Area */}
          <div className="flex items-center gap-3">
            <div className="bg-black text-white px-3 py-1.5 font-mono text-xs tracking-widest font-bold rounded-sm">
              ZK-ML
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-sans font-medium text-lg leading-tight tracking-tight uppercase text-neutral-900">
                  Provable inference verifier
                </span>
                <span className="text-[10px] bg-neutral-100 text-neutral-800 font-mono py-0.5 px-2 rounded border border-neutral-200 font-semibold tracking-wider uppercase">
                  v0.1.4 / ACTIVE
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 font-sans tracking-wide mt-0.5">
                Zero-Knowledge Proof Evaluation Registry for Large Language Models & Quantized Lattices
              </p>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex bg-neutral-50 p-1 rounded border border-neutral-200">
            <button
              onClick={() => setActiveTab('playground')}
              className={`flex items-center gap-2 px-4 py-2 rounded text-xs font-sans font-medium transition-all cursor-pointer ${
                activeTab === 'playground'
                  ? 'bg-black text-white shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100'
              }`}
            >
              <Terminal className="h-3.5 w-3.5" />
              Proof Playground
            </button>
            <button
              onClick={() => setActiveTab('design')}
              className={`flex items-center gap-2 px-4 py-2 rounded text-xs font-sans font-medium transition-all cursor-pointer ${
                activeTab === 'design'
                  ? 'bg-black text-white shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              Technical Design
            </button>
            <button
              onClick={() => setActiveTab('repository')}
              className={`flex items-center gap-2 px-4 py-2 rounded text-xs font-sans font-medium transition-all cursor-pointer ${
                activeTab === 'repository'
                  ? 'bg-black text-white shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100'
              }`}
            >
              <Code2 className="h-3.5 w-3.5" />
              Workspace Source
            </button>
          </div>

        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        
        {/* Informative Top Hint Banner */}
        <div className="mb-6 bg-neutral-50 border border-neutral-200 p-4 flex items-start gap-3 rounded-lg">
          <AlertCircle className="h-5 w-5 text-neutral-600 shrink-0 mt-0.5" />
          <div className="text-xs text-neutral-600 leading-relaxed font-mono">
            <strong className="text-neutral-900 font-sans tracking-wide">SYSTEM CONTEXT:</strong> Every model interaction computed dynamically is accompanied by a SNARK mathematical parameter verification. 
            Adjust weight factors in the playground controls to trigger simulated cryptographic validation failures.
          </div>
        </div>

        {/* Dynamic Tab Rendering */}
        <div className="transition-all duration-300">
          {activeTab === 'playground' && <CryptographicPlayground />}
          {activeTab === 'design' && <TechnicalDesign />}
          {activeTab === 'repository' && <RepositoryExplorer />}
        </div>

      </main>

      {/* Footer System Details */}
      <footer className="border-t border-neutral-250 bg-white py-6 px-6 mt-12 text-center text-neutral-500 text-[10px] font-mono uppercase">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap justify-center gap-4">
            <span>zk-snark groth16</span>
            <span>●</span>
            <span>poseidon hash optimized</span>
            <span>●</span>
            <span>rust-core execution</span>
          </div>
          <div className="text-neutral-900 font-semibold tracking-widest">
            AUTHENTICITY CRYPTOGRAPHICALLY ASSURED
          </div>
        </div>
      </footer>
    </div>
  );
}
