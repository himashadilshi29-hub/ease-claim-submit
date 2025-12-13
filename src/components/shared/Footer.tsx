import { Phone, Mail, MapPin } from "lucide-react";
import Logo from "./Logo";
import { useLanguage } from "@/lib/i18n";

const Footer = () => {
  const { t } = useLanguage();

  return (
    <footer className="bg-[#1a1a1a] text-white py-12">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Logo & Description */}
          <div>
            <Logo variant="dark" />
            <p className="text-gray-400 mt-4 text-sm">
              {t.footerDesc}
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-lg mb-4">{t.quickLinks}</h3>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  {t.linkSubmitOPD}
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  {t.linkTrackStatus}
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  {t.linkDigitalPortal}
                </a>
              </li>
            </ul>
          </div>

          {/* Contact Us */}
          <div>
            <h3 className="font-semibold text-lg mb-4">{t.contactUs}</h3>
            <ul className="space-y-3 text-gray-400 text-sm">
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary" />
                <span>+94 11 2 303 303</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary" />
                <span>claims@janashakthi.lk</span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-primary mt-0.5" />
                <span>Janashakthi Centre, Colombo 02</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-500 text-sm">
          {t.copyright}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
