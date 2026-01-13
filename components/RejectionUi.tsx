"use client"

import { XCircle, ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface RejectionUiProps {
  applicantName?: string
  applicationId?: string
}

const RejectionUi = ({
  applicantName = "Applicant",
  applicationId = "N/A",
}: RejectionUiProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-red-100 to-orange-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-red-200 overflow-hidden animate-popup">
        
        {/* Main Rejection Highlight - ANIMATED */}
        <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-8 text-white text-center relative overflow-hidden animate-pulse-slow">
          {/* Shimmer light effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-white/20 via-white/0 to-white/10 animate-shimmer"></div>
          
          {/* Icon - Animated */}
          <div className="w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-6 relative z-10 animate-bounce-slow">
            <XCircle className="w-12 h-12 text-white drop-shadow-lg" />
          </div>
          
          {/* Title - Animated */}
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 leading-tight relative z-10 animate-slideUp">
            Application Not Approved
          </h1>
          
          {/* Message 1 - Animated */}
          <p className="text-lg sm:text-xl opacity-90 max-w-sm mx-auto leading-relaxed relative z-10 animate-slideUp delay-100">
            Thank you for your interest, {applicantName}.
          </p>
          
          {/* Message 2 - Animated */}
          <p className="text-base opacity-90 max-w-sm mx-auto leading-relaxed relative z-10 animate-slideUp delay-200">
            Unfortunately, we're unable to approve your loan application at this time.
          </p>
          
          {/* Application ID - Animated */}
          <div className="mt-6 inline-flex items-center gap-2 text-sm bg-white bg-opacity-20 px-4 py-2 rounded-full backdrop-blur-sm relative z-10 animate-slideUp delay-300 border border-white/30">
            <span className="w-2 h-2 bg-white rounded-full animate-ping"></span>
            Application ID: <span className="font-semibold">{applicationId}</span>
          </div>
        </div>

        {/* Minimal Footer */}
        <div className="px-6 py-6 bg-gray-50 text-center border-t border-gray-200 animate-slideUp delay-400">
          <p className="text-xs text-gray-500 leading-relaxed mb-3">
            This decision is based on information available at the time of review.
          </p>
          <Link 
            href="/" 
            className="inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 font-medium transition-all duration-200 cursor-pointer group -mt-1"
          >
            <span>Return to Home</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform duration-200" />
          </Link>
        </div>
      </div>
    </div>
  )
}

export default RejectionUi
