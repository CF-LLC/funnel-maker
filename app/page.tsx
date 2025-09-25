import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Funnel Maker</h1>
            </div>
            <nav className="flex space-x-8">
              <a href="#features" className="text-gray-600 hover:text-gray-900">Features</a>
              <a href="#templates" className="text-gray-600 hover:text-gray-900">Templates</a>
              <a href="#pricing" className="text-gray-600 hover:text-gray-900">Pricing</a>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            Build High-Converting <span className="text-blue-600">Sales Funnels</span>
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Create professional sales funnels with our drag-and-drop builder. 
            No coding required - just choose a template, customize, and launch.
          </p>
          
          <div className="flex gap-4 justify-center mb-12">
            <Link 
              href="/builder"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold text-lg transition-colors inline-block"
            >
              Start Building Free
            </Link>
            <button className="border border-gray-300 hover:border-gray-400 text-gray-700 px-8 py-3 rounded-lg font-semibold text-lg transition-colors">
              View Templates
            </button>
          </div>
        </div>

        {/* Funnel Builder Preview */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-16">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">Visual Funnel Builder</h3>
          
          {/* Funnel Steps */}
          <div className="flex items-center justify-center space-x-4 overflow-x-auto">
            <div className="flex-shrink-0 bg-blue-100 border-2 border-blue-300 rounded-lg p-4 w-48">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-600 rounded-full mx-auto mb-3 flex items-center justify-center">
                  <span className="text-white font-bold">1</span>
                </div>
                <h4 className="font-semibold text-gray-900">Landing Page</h4>
                <p className="text-sm text-gray-600">Capture visitor attention</p>
              </div>
            </div>
            
            <div className="flex-shrink-0 text-gray-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            
            <div className="flex-shrink-0 bg-green-100 border-2 border-green-300 rounded-lg p-4 w-48">
              <div className="text-center">
                <div className="w-12 h-12 bg-green-600 rounded-full mx-auto mb-3 flex items-center justify-center">
                  <span className="text-white font-bold">2</span>
                </div>
                <h4 className="font-semibold text-gray-900">Lead Capture</h4>
                <p className="text-sm text-gray-600">Collect contact info</p>
              </div>
            </div>
            
            <div className="flex-shrink-0 text-gray-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            
            <div className="flex-shrink-0 bg-purple-100 border-2 border-purple-300 rounded-lg p-4 w-48">
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-600 rounded-full mx-auto mb-3 flex items-center justify-center">
                  <span className="text-white font-bold">3</span>
                </div>
                <h4 className="font-semibold text-gray-900">Sales Page</h4>
                <p className="text-sm text-gray-600">Present your offer</p>
              </div>
            </div>
            
            <div className="flex-shrink-0 text-gray-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            
            <div className="flex-shrink-0 bg-orange-100 border-2 border-orange-300 rounded-lg p-4 w-48">
              <div className="text-center">
                <div className="w-12 h-12 bg-orange-600 rounded-full mx-auto mb-3 flex items-center justify-center">
                  <span className="text-white font-bold">4</span>
                </div>
                <h4 className="font-semibold text-gray-900">Thank You</h4>
                <p className="text-sm text-gray-600">Confirm conversion</p>
              </div>
            </div>
          </div>
          
          <div className="mt-8 text-center">
            <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2 rounded-lg transition-colors">
              + Add Step
            </button>
          </div>
        </div>

        {/* Features Section */}
        <div id="features" className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.79 4 8.5 4s8.5-1.79 8.5-4V7M4 7c0 2.21 3.79 4 8.5 4s8.5-1.79 8.5-4M4 7c0-2.21 3.79-4 8.5-4s8.5 1.79 8.5 4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Drag & Drop Builder</h3>
            <p className="text-gray-600">Build funnels visually with our intuitive drag-and-drop interface. No technical skills required.</p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 00-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Analytics & Tracking</h3>
            <p className="text-gray-600">Monitor conversion rates, track performance, and optimize your funnels with detailed analytics.</p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready-to-Use Templates</h3>
            <p className="text-gray-600">Choose from dozens of proven funnel templates and customize them to match your brand.</p>
          </div>
        </div>

        {/* Templates Section */}
        <div id="templates" className="text-center mb-16">
          <h3 className="text-3xl font-bold text-gray-900 mb-8">Popular Funnel Templates</h3>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <div className="h-32 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg mb-4 flex items-center justify-center">
                <span className="text-blue-600 font-semibold">Lead Magnet</span>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Lead Generation Funnel</h4>
              <p className="text-sm text-gray-600 mb-4">Perfect for capturing email addresses with a free offer</p>
              <Link 
                href="/builder"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors inline-block text-center"
              >
                Use Template
              </Link>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <div className="h-32 bg-gradient-to-br from-green-100 to-green-200 rounded-lg mb-4 flex items-center justify-center">
                <span className="text-green-600 font-semibold">Product Sale</span>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Product Sales Funnel</h4>
              <p className="text-sm text-gray-600 mb-4">Complete sales funnel with upsells and order forms</p>
              <Link 
                href="/builder"
                className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg transition-colors inline-block text-center"
              >
                Use Template
              </Link>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <div className="h-32 bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg mb-4 flex items-center justify-center">
                <span className="text-purple-600 font-semibold">Webinar</span>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Webinar Funnel</h4>
              <p className="text-sm text-gray-600 mb-4">Register attendees and convert them during your webinar</p>
              <Link 
                href="/builder"
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg transition-colors inline-block text-center"
              >
                Use Template
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Funnel Maker</h4>
              <p className="text-gray-600 text-sm">
                Build high-converting sales funnels with ease. No coding required.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Features</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="#" className="hover:text-gray-900">Drag & Drop Builder</a></li>
                <li><a href="#" className="hover:text-gray-900">Templates</a></li>
                <li><a href="#" className="hover:text-gray-900">Analytics</a></li>
                <li><a href="#" className="hover:text-gray-900">Integrations</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="#" className="hover:text-gray-900">Documentation</a></li>
                <li><a href="#" className="hover:text-gray-900">Tutorials</a></li>
                <li><a href="#" className="hover:text-gray-900">Blog</a></li>
                <li><a href="#" className="hover:text-gray-900">Support</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="#" className="hover:text-gray-900">About</a></li>
                <li><a href="#" className="hover:text-gray-900">Contact</a></li>
                <li><a href="#" className="hover:text-gray-900">Privacy</a></li>
                <li><a href="#" className="hover:text-gray-900">Terms</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-200 pt-8 mt-8 text-center">
            <p className="text-gray-600 text-sm">
              © 2024 Funnel Maker. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
