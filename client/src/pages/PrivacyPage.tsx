import { useEffect } from 'react';
import { Link } from 'wouter';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

const PrivacyPage = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-grow container mx-auto px-4 pt-24 pb-12 max-w-5xl">
        <h1 className="text-3xl md:text-4xl font-bold mb-8">Privacy Policy</h1>
        
        <div className="prose prose-lg max-w-none">
          <p className="text-lg mb-4">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">1. Introduction</h2>
          <p>At mirror., we respect your privacy and are committed to protecting your personal data. This Privacy Policy explains how we collect, use, and safeguard your information when you use our AI-powered photo analysis service. Please read this Privacy Policy carefully to understand our practices regarding your personal data.</p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">2. Information We Collect</h2>
          <p>We collect and process the following information when you use our service:</p>
          <ul className="list-disc pl-6 mb-4">
            <li className="mb-2"><strong>Photos:</strong> Images you upload for analysis.</li>
            <li className="mb-2"><strong>EXIF Data:</strong> When present in your photos, we may process metadata such as camera model, lens settings, and other technical information contained in EXIF data.</li>
            <li className="mb-2"><strong>Analysis Preferences:</strong> Options you select for photo analysis, such as focus points, critique style, and language preferences.</li>
            <li className="mb-2"><strong>Log Data:</strong> Usage data such as your IP address, browser type, pages visited, and time and date of your visit.</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-4">3. How We Use Your Information</h2>
          <ul className="list-disc pl-6 mb-4">
            <li className="mb-2">To provide and maintain our photo analysis service</li>
            <li className="mb-2">To process and analyze your photos using AI technology</li>
            <li className="mb-2">To improve our AI models and analysis algorithms</li>
            <li className="mb-2">To communicate with you and respond to your inquiries</li>
            <li className="mb-2">To detect and prevent fraud, security breaches, and other potentially illegal activities</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-4">4. Data Storage and Security</h2>
          <p>We implement appropriate technical and organizational measures to protect your personal data. However, please note that no method of transmission over the internet or electronic storage is 100% secure.</p>
          <p>Your photos and analysis results are stored securely in our database. Uploaded photos may be temporarily processed by third-party AI services, but all data is transferred using secure protocols.</p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">5. Data Sharing and Third Parties</h2>
          <p>We may share your information with:</p>
          <ul className="list-disc pl-6 mb-4">
            <li className="mb-2">AI service providers (like Google Cloud and OpenAI) as necessary to analyze your photos</li>
            <li className="mb-2">Service providers who help us operate our platform</li>
            <li className="mb-2">Legal authorities when required by law or to protect our rights</li>
          </ul>
          
          <h2 className="text-2xl font-semibold mt-8 mb-4">6. Your Rights</h2>
          <p>Depending on your location, you may have rights to:</p>
          <ul className="list-disc pl-6 mb-4">
            <li className="mb-2">Access the personal data we hold about you</li>
            <li className="mb-2">Request correction of inaccurate data</li>
            <li className="mb-2">Request deletion of your data</li>
            <li className="mb-2">Object to our processing of your data</li>
            <li className="mb-2">Request transfer of your data</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-4">7. Cookies</h2>
          <p>We use cookies and similar tracking technologies to track activity on our Service and hold certain information. Cookies are files with a small amount of data which may include an anonymous unique identifier.</p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">8. Changes to This Privacy Policy</h2>
          <p>We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.</p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">9. Contact Us</h2>
          <p>If you have any questions about this Privacy Policy, please contact us at <a href="mailto:ivoryboxedlee@gmail.com" className="text-primary hover:text-primary/80">ivoryboxedlee@gmail.com</a>.</p>

          <div className="my-8">
            <Link href="/">
              <button className="bg-primary hover:bg-primary/90 text-white py-2 px-6 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 transition-colors">
                Return to Home
              </button>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PrivacyPage;