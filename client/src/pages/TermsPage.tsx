import { useEffect } from 'react';
import { Link } from 'wouter';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

const TermsPage = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-grow container mx-auto px-4 pt-24 pb-12 max-w-5xl">
        <h1 className="text-3xl md:text-4xl font-bold mb-8">Terms of Service</h1>
        
        <div className="prose prose-lg max-w-none">
          <p className="text-lg mb-4">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">1. Introduction</h2>
          <p>Welcome to mirror. ("we," "our," or "us"). These Terms of Service ("Terms") govern your access to and use of our website, services, and applications (collectively, the "Service"). By accessing or using our Service, you agree to be bound by these Terms.</p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">2. Using Our Services</h2>
          <p>You must follow any policies made available to you within the Services. You may use our Services only as permitted by law. We may suspend or stop providing our Services to you if you do not comply with our terms or policies or if we are investigating suspected misconduct.</p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">3. Your Content</h2>
          <p>Our Services allow you to upload, submit, store, send, and receive content such as photos for analysis. You retain ownership of any intellectual property rights that you hold in that content. When you upload, submit, store, send, or receive content to or through our Services, you grant us a limited license to use, host, and store your content solely for the purpose of providing the Services to you. This license terminates when you stop using our Services. We will not use your content for marketing purposes or share it with third parties without your explicit consent.</p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">4. Privacy and Copyright Protection</h2>
          <p>Our privacy policy explains how we treat your personal data and protect your privacy when you use our Services. By using our Services, you agree that we can use such data in accordance with our privacy policy.</p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">5. Modifying and Terminating our Services</h2>
          <p>We are constantly changing and improving our Services. We may add or remove functionalities or features, and we may suspend or stop a Service altogether. You can stop using our Services at any time, although we'll be sorry to see you go.</p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">6. Our Warranties and Disclaimers</h2>
          <p>We provide our Services using a commercially reasonable level of skill and care. But there are certain things that we don't promise about our Services. OTHER THAN AS EXPRESSLY SET OUT IN THESE TERMS OR ADDITIONAL TERMS, NEITHER MIRROR NOR ITS SUPPLIERS OR DISTRIBUTORS MAKE ANY SPECIFIC PROMISES ABOUT THE SERVICES. FOR EXAMPLE, WE DON'T MAKE ANY COMMITMENTS ABOUT THE CONTENT WITHIN THE SERVICES, THE SPECIFIC FUNCTIONS OF THE SERVICES, OR THEIR RELIABILITY, AVAILABILITY, OR ABILITY TO MEET YOUR NEEDS. WE PROVIDE THE SERVICES "AS IS".</p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">7. Liability for our Services</h2>
          <p>WHEN PERMITTED BY LAW, MIRROR, AND MIRROR'S SUPPLIERS AND DISTRIBUTORS, WILL NOT BE RESPONSIBLE FOR LOST PROFITS, REVENUES, OR DATA, FINANCIAL LOSSES OR INDIRECT, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES. TO THE EXTENT PERMITTED BY LAW, THE TOTAL LIABILITY OF MIRROR, AND ITS SUPPLIERS AND DISTRIBUTORS, FOR ANY CLAIMS UNDER THESE TERMS, INCLUDING FOR ANY IMPLIED WARRANTIES, IS LIMITED TO THE AMOUNT YOU PAID US TO USE THE SERVICES.</p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">8. About these Terms</h2>
          <p>We may modify these terms or any additional terms that apply to a Service to, for example, reflect changes to the law or changes to our Services. You should look at the terms regularly. We'll post notice of modifications to these terms on this page. Changes will not apply retroactively and will become effective no sooner than fourteen days after they are posted. However, changes addressing new functions for a Service or changes made for legal reasons will be effective immediately.</p>

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

export default TermsPage;