import { FaCheckCircle } from "react-icons/fa";
import FeatureList from "./FeatureList";

export default function SubscriptionPlans() {
  const basicFeatures = [
    "Access to 5 guided meditations per month",
    "3 beginner-friendly yoga flows (15–20 mins each)",
    "Community support via wellness forums",
    "Basic progress tracking & mindfulness journal",
    "Limited access to live sessions (1 per month)",
  ];

  const explorerFeatures = [
    "Unlimited access to 100+ guided meditations",
    "20+ yoga classes (all levels: gentle, flow, restorative)",
    "Weekly live sessions (meditation & yoga)",
    "Personalized wellness tips & monthly challenges",
    "Progress tracking & downloadable resources",
  ];

  const premiumFeatures = [
    "Everything in Wellness Explorer, plus:",
    "Unlimited live classes (meditation, yoga, breathwork)",
    "1 private coaching session/month (yoga or mindfulness)",
    "Exclusive workshops (sound healing, chakra balancing)",
    "Exclusive workshops (sound healing, chakra balancing)",
  ];

  return (
    <section className="px-6 py-12 text-gray-900">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-2">Subscriptions & Plans</h2>
          <p className="text-gray-600 mb-10">
            Find the perfect plan to nurture your mind, body, and soul.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Basic Plan */}
          <div className="border-[3px] border-[#D3C0B5] rounded-xl p-6 bg-gradient-to-b from-[#F9C49C] to-white">
            <h3 className="text-lg font-semibold mb-1">Basic</h3>
            <p className="text-3xl font-bold mb-1">₹0</p>
            <p className="text-sm text-gray-600 mb-4">
              Ideal for beginners exploring mindfulness and gentle yoga.
            </p>
            <button className="w-full text-black border border-[#A35F00] py-2 rounded-md font-medium hover:bg-white/10">
              Start for Free
            </button>
            <FeatureList features={basicFeatures} />
          </div>

          {/* Wellness Explorer Plan */}
          <div className="relative border-[3px] border-[#FFC192] rounded-xl p-6 bg-gradient-to-b from-[#1C0F08] to-[#5A422D] text-white shadow-[-16px_16px_18px_rgba(0,0,0,0.25)]">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-[#BF7444] text-white text-xs font-semibold px-3 py-1 rounded-b-xl">
              Recommended
            </div>
            <h3 className="text-lg font-semibold my-2">Wellness Explorer</h3>
            <p className="text-3xl font-bold mb-1">
              ₹500 <span className="text-base font-normal">per month</span>
            </p>
            <p className="text-sm text-white/80 mb-4">
              Perfect for regular practitioners seeking balance and growth.
            </p>
            <button className="w-full bg-[#863D15] hover:bg-[#b7692f] text-white border-[#BC986A] border-2 py-2 rounded-md font-medium">
              Start 7-Day Free Trial
            </button>
            <FeatureList features={explorerFeatures} textColor="text-white" />
          </div>

          {/* Premium Plan */}
          <div className="border-[3px] border-[#D3C0B5] rounded-xl p-6 bg-gradient-to-b from-[#F9C49C] to-white">
            <h3 className="text-lg font-semibold mb-1">Premium</h3>
            <p className="text-3xl font-bold mb-1">
              ₹900 <span className="text-base font-normal">per month</span>
            </p>
            <p className="text-sm text-gray-600 mb-4">
              For deep transformation with premium guidance and 1:1 support.
            </p>
            <button className="w-full text-black border border-black py-2 rounded-md font-medium hover:bg-white/10">
              Start 7-Day Free Trial
            </button>
            <FeatureList features={premiumFeatures} />
          </div>
        </div>
      </div>
    </section>
  );
}
