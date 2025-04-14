import { Link } from "wouter";
import { useTranslation } from "react-i18next";

const Footer = () => {
  const { t, i18n } = useTranslation();
  
  const currentYear = new Date().getFullYear();
  
  // Always use English for the footer regardless of the current language
  const termsText = "Terms of Service";
  const privacyText = "Privacy Policy";
  const contactText = "Contact";
  const allRightsReserved = "All rights reserved.";
  
  return (
    <footer className="bg-slate-900 text-white py-4 pb-8 relative z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-row justify-between items-center text-xs">
          <span className="text-slate-500">&copy; {currentYear} mirror.</span>
          <div className="flex space-x-3">
            <Link href="/terms">
              <span className="hover:text-white transition-colors text-slate-400">{termsText}</span>
            </Link>
            <Link href="/privacy">
              <span className="hover:text-white transition-colors text-slate-400">{privacyText}</span>
            </Link>
            <a href="mailto:ivoryboxedlee@gmail.com" className="hover:text-white transition-colors text-slate-400">
              {contactText}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
