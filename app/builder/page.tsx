'use client';

import Link from 'next/link';
import { useState } from 'react';

interface FunnelStep {
  id: string;
  type: 'landing' | 'optin' | 'sales' | 'thankyou' | 'upsell';
  title: string;
  description: string;
}

const stepTypes = [
  { type: 'landing' as const, title: 'Landing Page', description: 'Capture visitor attention', color: 'blue' },
  { type: 'optin' as const, title: 'Opt-in Page', description: 'Collect contact information', color: 'green' },
  { type: 'sales' as const, title: 'Sales Page', description: 'Present your main offer', color: 'purple' },
  { type: 'upsell' as const, title: 'Upsell Page', description: 'Additional offer after purchase', color: 'orange' },
  { type: 'thankyou' as const, title: 'Thank You Page', description: 'Confirm and deliver', color: 'pink' },
];

const colorClasses: Record<string, string> = {
  blue: 'bg-blue-100 border-blue-300 text-blue-700',
  green: 'bg-green-100 border-green-300 text-green-700',
  purple: 'bg-purple-100 border-purple-300 text-purple-700',
  orange: 'bg-orange-100 border-orange-300 text-orange-700',
  pink: 'bg-pink-100 border-pink-300 text-pink-700',
};

export default function FunnelBuilder() {
  const [funnelSteps, setFunnelSteps] = useState<FunnelStep[]>([
    {
      id: '1',
      type: 'landing',
      title: 'Landing Page',
      description: 'Capture visitor attention'
    }
  ]);

  const [funnelName, setFunnelName] = useState('My New Funnel');

  const addStep = (type: FunnelStep['type']) => {
    const stepType = stepTypes.find(st => st.type === type);
    if (!stepType) return;

    const newStep: FunnelStep = {
      id: Date.now().toString(),
      type,
      title: stepType.title,
      description: stepType.description
    };

    setFunnelSteps([...funnelSteps, newStep]);
  };

  const removeStep = (id: string) => {
    if (funnelSteps.length > 1) {
      setFunnelSteps(funnelSteps.filter(step => step.id !== id));
    }
  };

  const moveStep = (id: string, direction: 'up' | 'down') => {
    const currentIndex = funnelSteps.findIndex(step => step.id === id);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= funnelSteps.length) return;

    const newSteps = [...funnelSteps];
    [newSteps[currentIndex], newSteps[newIndex]] = [newSteps[newIndex], newSteps[currentIndex]];
    setFunnelSteps(newSteps);
  };

  const getStepColor = (type: FunnelStep['type']) => {
    const stepType = stepTypes.find(st => st.type === type);
    return stepType?.color || 'blue';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-blue-600 hover:text-blue-800 font-semibold">
                ← Back to Home
              </Link>
              <div className="h-6 w-px bg-gray-300"></div>
              <input
                type="text"
                value={funnelName}
                onChange={(e) => setFunnelName(e.target.value)}
                className="text-xl font-bold bg-transparent border-none outline-none focus:bg-gray-50 px-2 py-1 rounded"
              />
            </div>
            <div className="flex space-x-3">
              <button className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50">
                Preview
              </button>
              <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
                Save & Publish
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-12 gap-8">
          {/* Sidebar - Step Types */}
          <div className="col-span-3 bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Step</h3>
            <div className="space-y-3">
              {stepTypes.map((stepType) => (
                <button
                  key={stepType.type}
                  onClick={() => addStep(stepType.type)}
                  className="w-full p-3 text-left border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  <div className="font-medium text-gray-900">{stepType.title}</div>
                  <div className="text-sm text-gray-600">{stepType.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Main Canvas */}
          <div className="col-span-9">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Funnel Flow</h2>
                <div className="text-sm text-gray-600">
                  {funnelSteps.length} step{funnelSteps.length !== 1 ? 's' : ''}
                </div>
              </div>

              {/* Funnel Steps */}
              <div className="space-y-4">
                {funnelSteps.map((step, index) => (
                  <div key={step.id} className="flex items-center">
                    {/* Step Number */}
                    <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-semibold text-gray-600 mr-4">
                      {index + 1}
                    </div>

                    {/* Step Card */}
                    <div className={`flex-1 p-4 rounded-lg border-2 ${colorClasses[getStepColor(step.type)]}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold">{step.title}</h4>
                          <p className="text-sm opacity-75">{step.description}</p>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => moveStep(step.id, 'up')}
                            disabled={index === 0}
                            className="p-1 rounded hover:bg-white/50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          </button>
                          
                          <button
                            onClick={() => moveStep(step.id, 'down')}
                            disabled={index === funnelSteps.length - 1}
                            className="p-1 rounded hover:bg-white/50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          
                          <button
                            onClick={() => removeStep(step.id)}
                            disabled={funnelSteps.length === 1}
                            className="p-1 rounded hover:bg-red-100 text-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Arrow */}
                    {index < funnelSteps.length - 1 && (
                      <div className="flex-shrink-0 ml-4 text-gray-400">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Conversion Metrics */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Estimated Conversion</h3>
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">1,000</div>
                    <div className="text-sm text-gray-600">Visitors</div>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">250</div>
                    <div className="text-sm text-gray-600">Leads (25%)</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">25</div>
                    <div className="text-sm text-gray-600">Sales (10%)</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">$2,500</div>
                    <div className="text-sm text-gray-600">Revenue</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}