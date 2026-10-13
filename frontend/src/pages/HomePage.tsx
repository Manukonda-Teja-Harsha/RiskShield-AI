import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../components/common/Navbar';
import { Footer } from '../components/common/Footer';
import { BrandDetailModal } from '../components/common/BrandDetailModal';
import { HeroSection } from '../components/home/HeroSection';
import { MarketingPerformanceSection } from '../components/home/MarketingPerformanceSection';
import { FeaturedBrandCardsSection } from '../components/home/FeaturedBrandCardsSection';
import { RecentBrandRegistrationsSection } from '../components/home/RecentBrandRegistrationsSection';
import { WorkflowSection } from '../components/home/WorkflowSection';
import { FaqSection } from '../components/home/FaqSection';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();

  const handleOpenAuth = (role: 'user' | 'brand_owner' = 'user') => {
    navigate('/login', { state: { initialRole: role } });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors">
      {/* Agreed Minimal Navbar: [Logo] -> [Theme Toggle] -> [Log in] */}
      <Navbar onOpenAuth={() => handleOpenAuth('user')} />

      <main className="flex-1">
        {/* Section 1: Hero & Unified Quick Scanner */}
        <HeroSection onOpenBrandAuth={() => handleOpenAuth('brand_owner')} />

        {/* Section 2: Marketing Performance & Redesigned Category Pie Chart */}
        <MarketingPerformanceSection />

        {/* Section 3: Three Brand Cards with Highlighted Center Card */}
        <FeaturedBrandCardsSection />

        {/* Section 4: Recently Registered Brands — Promotional Section */}
        <RecentBrandRegistrationsSection onOpenBrandAuth={() => handleOpenAuth('brand_owner')} />

        {/* Section 5: Four-Stage Workflow Section (Submit -> Analyze -> Verify -> Protect) */}
        <WorkflowSection />

        {/* Section 6: Frequently Asked Questions & Final CTA */}
        <FaqSection onOpenAuth={() => handleOpenAuth('user')} />
      </main>

      {/* Operational Platform Footer */}
      <Footer />

      {/* Interactive Brand Detail & Discovery Modal */}
      <BrandDetailModal />
    </div>
  );
};

export default HomePage;
