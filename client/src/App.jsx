import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import LoginView from './components/LoginView';
import UploadZone from './components/UploadZone';
import ReceiptViewer from './components/ReceiptViewer';
import VerificationForm from './components/VerificationForm';
import SuccessModal from './components/SuccessModal';
import Footer from './components/Footer';
import CreditsModal from './components/CreditsModal';
import { authApi, receiptApi } from './services/api';
import { toast } from 'sonner';
import { Loader2, Eye, EyeOff } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [creditsModalOpen, setCreditsModalOpen] = useState(false);

  // Workflow states: 'IDLE' | 'ANALYZING' | 'VERIFYING' | 'SUBMITTING' | 'SUCCESS'
  const [workflowState, setWorkflowState] = useState('IDLE');
  const [tempImageId, setTempImageId] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [submissionResult, setSubmissionResult] = useState(null);

  // Mobile receipt preview drawer state
  const [showMobileImage, setShowMobileImage] = useState(true);

  // Check auth session and handle Google OAuth callback on mount
  useEffect(() => {
    async function initAuth() {
      const urlParams = new URLSearchParams(window.location.search);
      const errorParam = urlParams.get('error');
      const code = urlParams.get('code');

      if (errorParam) {
        toast.error(`Google Sign-In: ${errorParam}`);
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      if (code) {
        // Exchange Google authorization code
        try {
          toast.loading('Finalizing Google sign-in & setting up your Google Sheet...');
          const data = await authApi.handleCallback(code);
          setUser(data.user);
          toast.dismiss();
          toast.success(`Welcome, ${data.user.name || data.user.email}!`);
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (err) {
          toast.dismiss();
          toast.error(err.message || 'Google authentication failed.');
        } finally {
          setAuthLoading(false);
        }
      } else {
        // Check current session
        try {
          const data = await authApi.getCurrentUser();
          if (data.authenticated && data.user) {
            setUser(data.user);
          }
        } catch (err) {
          console.error('Session check error:', err);
        } finally {
          setAuthLoading(false);
        }
      }
    }

    initAuth();
  }, []);

  const handleLogout = async () => {
    try {
      await authApi.logout();
      setUser(null);
      setWorkflowState('IDLE');
      toast.success('Signed out successfully');
    } catch (err) {
      toast.error('Failed to log out');
    }
  };

  const handleFileSelect = async (file) => {
    // Check if user has scan credits remaining
    if ((user?.scanCredits ?? 0) <= 0) {
      setCreditsModalOpen(true);
      toast.error("You're out of scan credits! Please redeem a voucher code.");
      return;
    }

    try {
      setWorkflowState('ANALYZING');
      const localPreview = URL.createObjectURL(file);
      setPreviewUrl(localPreview);

      const res = await receiptApi.analyzeReceipt(file);

      // Decrement credits in real-time
      if (typeof res.remainingCredits === 'number') {
        setUser((prev) => ({ ...prev, scanCredits: res.remainingCredits }));
      }

      setTempImageId(res.tempImageId);
      if (res.previewUrl) {
        setPreviewUrl(res.previewUrl);
      }
      setExtractedData(res.data);
      setWorkflowState('VERIFYING');
      toast.success('Receipt analyzed! Please verify extracted fields.');
    } catch (err) {
      console.error('Analysis error:', err);
      if (err.message?.includes('out_of_credits')) {
        setCreditsModalOpen(true);
      }
      toast.error(err.message || 'Failed to extract receipt data.');
      setWorkflowState('IDLE');
    }
  };

  const handleSubmitVerified = async (formData) => {
    if (!tempImageId) return;

    try {
      setWorkflowState('SUBMITTING');
      const res = await receiptApi.submitReceipt(tempImageId, formData);
      setSubmissionResult(res);
      setWorkflowState('SUCCESS');
      toast.success('Saved to your Google Sheet and Google Drive!');
    } catch (err) {
      console.error('Submission error:', err);
      toast.error(err.message || 'Failed to save receipt.');
      setWorkflowState('VERIFYING');
    }
  };

  const handleDiscard = async () => {
    if (tempImageId) {
      try {
        await receiptApi.discardReceipt(tempImageId);
      } catch (_) {}
    }
    setTempImageId(null);
    setPreviewUrl(null);
    setExtractedData(null);
    setWorkflowState('IDLE');
    toast('Receipt discarded');
  };

  const handleScanAgain = () => {
    setTempImageId(null);
    setPreviewUrl(null);
    setExtractedData(null);
    setSubmissionResult(null);
    setWorkflowState('IDLE');
  };

  // 1. Initial Loading Spinner
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-sm font-medium text-slate-500">Loading Reesivoo...</p>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated Login Screen
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar user={null} onLogout={handleLogout} />
        <main className="flex-1">
          <LoginView onLoginSuccess={(u) => setUser(u)} />
        </main>
        <Footer />
      </div>
    );
  }

  // 3. Authenticated App Flow
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar
        user={user}
        onLogout={handleLogout}
        onOpenCreditsModal={() => setCreditsModalOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col">
        {/* State A: Idle or Analyzing */}
        {(workflowState === 'IDLE' || workflowState === 'ANALYZING') && (
          <div className="my-auto py-8">
            <UploadZone
              onFileSelect={handleFileSelect}
              isAnalyzing={workflowState === 'ANALYZING'}
            />
          </div>
        )}

        {/* State B: Split-screen Human-in-the-Loop Verification */}
        {(workflowState === 'VERIFYING' || workflowState === 'SUBMITTING') && (
          <div className="space-y-4">
            {/* Mobile View Toggle */}
            <div className="lg:hidden flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200">
              <span className="text-xs font-semibold text-slate-700">Receipt Photo Preview</span>
              <button
                type="button"
                onClick={() => setShowMobileImage(!showMobileImage)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              >
                {showMobileImage ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>Hide Photo</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5" />
                    <span>Show Photo</span>
                  </>
                )}
              </button>
            </div>

            {/* Responsive Grid: Desktop 50/50, Mobile Stacked */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* Left Column: Receipt Photo Viewer */}
              <div className={`${showMobileImage ? 'block' : 'hidden lg:block'} h-[360px] sm:h-[480px] lg:h-[620px] sticky top-20`}>
                <ReceiptViewer imageUrl={previewUrl} />
              </div>

              {/* Right Column: Editable Form */}
              <div className="min-h-[500px]">
                <VerificationForm
                  initialData={extractedData}
                  onSubmit={handleSubmitVerified}
                  onDiscard={handleDiscard}
                  isSubmitting={workflowState === 'SUBMITTING'}
                />
              </div>
            </div>
          </div>
        )}

        {/* State C: Success Modal */}
        {workflowState === 'SUCCESS' && (
          <div className="my-auto py-8">
            <SuccessModal result={submissionResult} onScanAgain={handleScanAgain} />
          </div>
        )}
      </main>
      <Footer />

      {/* Credits & Voucher Modal */}
      <CreditsModal
        isOpen={creditsModalOpen}
        onClose={() => setCreditsModalOpen(false)}
        user={user}
        onCreditsUpdated={(newCredits) => setUser((prev) => ({ ...prev, scanCredits: newCredits }))}
      />
    </div>
  );
}
