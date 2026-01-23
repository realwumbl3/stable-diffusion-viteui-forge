// VITE UI
import {
  Wand2
} from 'lucide-react'
import type { WelcomeProps } from '../types/components';

const Welcome = ({ onGetStarted }: WelcomeProps) => {

  return (
    <div className="studio-canvas flex items-center justify-center p-8">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-studio-accent/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Wand2 size={32} className="text-studio-accent" />
          </div>
          <h1 className="text-4xl font-bold text-studio-text mb-4">
            Welcome.
          </h1>

        </div>

        {/* Get Started */}
        <div className="text-center mb-12">
          <button
            onClick={() => onGetStarted()}
            className="studio-btn-primary text-lg px-8 py-4 flex items-center gap-3 mx-auto"
          >
            <Wand2 size={20} />
            Get Started
          </button>
        </div>

        {/* Features */}
        {/* <div className="mb-12">
          <h2 className="text-2xl font-semibold text-studio-text mb-6 text-center">
            Professional Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div key={index} className="text-center">
                <div className="w-12 h-12 bg-studio-accent/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <feature.icon size={24} className="text-studio-accent" />
                </div>
                <h3 className="font-semibold text-studio-text mb-2">{feature.title}</h3>
                <p className="text-sm text-studio-textSecondary">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div> */}

      </div>
    </div>
  )
}

export default Welcome
