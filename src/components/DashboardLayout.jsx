import React from 'react';
import { TrendingUp, Users, PieChart, BarChart3, Globe, GitBranch } from 'lucide-react';

const DashboardLayout = ({ children, title, stats }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 p-5">
      {/* Header */}
      <header className="bg-white p-5 rounded-lg shadow-lg mb-5">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="m-0 text-slate-700 text-3xl font-bold">
              {title}
            </h1>
            <p className="mt-1 text-gray-500 text-base">
              Interactive Analytics Dashboard (1981-2020)
            </p>
          </div>
          
          {/* Quick Stats */}
          {stats && (
            <div className="flex gap-4 flex-wrap">
              <div className="bg-blue-500 text-white px-4 py-3 rounded-md text-center min-w-32">
                <div className="text-xl font-bold">
                  {stats.totalEmigrants?.toLocaleString() || '0'}
                </div>
                <div className="text-xs opacity-90">
                  Total Emigrants
                </div>
              </div>
              
              <div className="bg-red-500 text-white px-4 py-3 rounded-md text-center min-w-32">
                <div className="text-xl font-bold">
                  {stats.yearRange || 'N/A'}
                </div>
                <div className="text-xs opacity-90">
                  Year Range
                </div>
              </div>
              
              <div className="bg-green-600 text-white px-4 py-3 rounded-md text-center min-w-32">
                <div className="text-xl font-bold">
                  {stats.topDestination || 'N/A'}
                </div>
                <div className="text-xs opacity-90">
                  Top Destination
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Navigation Pills */}
      <div className="bg-white p-4 rounded-lg shadow-sm mb-5">
        <div className="flex gap-2.5 flex-wrap justify-center">
          {[
            { icon: BarChart3, label: 'Comparison', color: 'bg-blue-500' },
            { icon: PieChart, label: 'Composition', color: 'bg-red-500' },
            { icon: TrendingUp, label: 'Trends', color: 'bg-green-600' },
            { icon: Users, label: 'Distribution', color: 'bg-orange-500' },
            { icon: GitBranch, label: 'Relationships', color: 'bg-purple-600' },
            { icon: Globe, label: 'Geographic', color: 'bg-slate-600' }
          ].map(({ icon: Icon, label, color }, index) => (
            <div
              key={label}
              className={`flex items-center gap-1.5 px-3 py-2 ${color} text-white rounded-full text-sm font-medium`}
            >
              <Icon size={16} />
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main>
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white p-4 rounded-lg shadow-sm mt-5 text-center text-gray-500 text-sm">
        <p className="m-0">
          Filipino Emigrants Analytics Dashboard • Data Source: Philippine Statistics Authority • 
          Visualization powered by React & Recharts
        </p>
      </footer>
    </div>
  );
};

export default DashboardLayout;