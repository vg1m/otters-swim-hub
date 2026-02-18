'use client'

import { useState, useEffect } from 'react'

export const CONSENT_POLICY_TEXT = `By registering with Otters Kenya Swim Club:

1. I confirm that the information provided above is accurate and complete to the best of my knowledge.

2. I agree to ensure that I / my child abides by the club's code of conduct, safety rules, and any instructions issued by coaches or staff.

3. I consent to the use of photographs or videos of myself / my child taken during training or competitions for club-related promotional materials, social media, or reports. If I do not wish to give media consent, I will notify the club in writing.

4. I acknowledge that registration is only complete upon payment of the non-refundable annual registration fee of KES 3,500.`

export default function ConsentPolicy({ 
  consents, 
  onConsentChange, 
  showCheckboxes = true,
  readOnly = false 
}) {
  const [hasScrolled, setHasScrolled] = useState(false)

  const handleScroll = (e) => {
    const element = e.target
    const scrolledToBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 10
    if (scrolledToBottom) {
      setHasScrolled(true)
    }
  }

  return (
    <div className="space-y-4">
      {/* Policy Text Container */}
      <div className="relative">
        <div 
          className="max-h-[300px] overflow-y-auto border-2 border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-stone-50 dark:bg-gray-800 scroll-smooth"
          onScroll={handleScroll}
        >
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
              Terms and Conditions
            </h3>
            <div className="text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">
              {CONSENT_POLICY_TEXT}
            </div>
          </div>
        </div>
        
        {/* Scroll indicator */}
        {!hasScrolled && !readOnly && (
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white dark:from-gray-800 to-transparent pointer-events-none flex items-end justify-center pb-2">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              ↓ Scroll to read full policy ↓
            </span>
          </div>
        )}
      </div>

      {/* Checkboxes */}
      {showCheckboxes && !readOnly && (
        <div className="space-y-4 mt-6">
          {/* Data Accuracy Consent - REQUIRED */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={consents.dataAccuracy}
              onChange={(e) => onConsentChange('dataAccuracy', e.target.checked)}
              className="mt-1 w-5 h-5 text-primary rounded focus:ring-2 focus:ring-primary border-gray-300 dark:border-gray-600"
              required
            />
            <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors">
              <span className="font-semibold">I confirm</span> that the information provided above is accurate and complete to the best of my knowledge.
              <span className="text-red-500 ml-1">*</span>
            </span>
          </label>

          {/* Code of Conduct Consent - REQUIRED */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={consents.codeOfConduct}
              onChange={(e) => onConsentChange('codeOfConduct', e.target.checked)}
              className="mt-1 w-5 h-5 text-primary rounded focus:ring-2 focus:ring-primary border-gray-300 dark:border-gray-600"
              required
            />
            <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors">
              <span className="font-semibold">I agree</span> to ensure that I / my child abides by the club's code of conduct, safety rules, and any instructions issued by coaches or staff.
              <span className="text-red-500 ml-1">*</span>
            </span>
          </label>

          {/* Media Consent - OPTIONAL */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={consents.mediaConsent}
              onChange={(e) => onConsentChange('mediaConsent', e.target.checked)}
              className="mt-1 w-5 h-5 text-primary rounded focus:ring-2 focus:ring-primary border-gray-300 dark:border-gray-600"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors">
              <span className="font-semibold">I consent</span> to the use of photographs or videos of myself / my child taken during training or competitions for club-related promotional materials, social media, or reports.
              <span className="text-xs text-gray-500 dark:text-gray-400 block mt-1">
                (Optional - You can opt out by unchecking this box or notifying the club in writing)
              </span>
            </span>
          </label>

          {/* Payment Acknowledgement Notice */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mt-4">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <span className="font-semibold">Payment Notice:</span> Registration is only complete upon payment of the non-refundable annual registration fee of KES 3,500. You can choose to pay now or pay later via invoice.
              </p>
            </div>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            <span className="text-red-500">*</span> Required consent
          </p>
        </div>
      )}

      {/* Read-only display for profile settings */}
      {readOnly && (
        <div className="space-y-3 mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
          <div className="flex items-center gap-2">
            <svg className={`w-5 h-5 ${consents.dataAccuracy ? 'text-green-600' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
            </svg>
            <span className="text-sm text-gray-700 dark:text-gray-300">Data Accuracy Confirmed</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className={`w-5 h-5 ${consents.codeOfConduct ? 'text-green-600' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
            </svg>
            <span className="text-sm text-gray-700 dark:text-gray-300">Code of Conduct Agreement</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className={`w-5 h-5 ${consents.mediaConsent ? 'text-green-600' : 'text-red-600'}`} fill="currentColor" viewBox="0 0 20 20">
              {consents.mediaConsent ? (
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
              ) : (
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
              )}
            </svg>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Media Consent: {consents.mediaConsent ? 'Granted' : 'Not Granted'}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
