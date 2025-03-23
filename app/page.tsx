"use client";
import { ArrowRight, Leaf, Recycle, Users, Coins, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Poppins } from "next/font/google";
import { useEffect, useState } from "react";
import {
  getRecentReports,
  getAllRewards,
  getWasteCollectionTasks,
} from "@/utils/db/actions";

const poppins = Poppins({
  weight: ["300", "400", "600"],
  subsets: ["latin"],
  display: "swap",
});

function AnimatedGlobe() {
  return (
    <div className='relative w-32 h-32 mx-auto mb-8'>
      <div className='absolute inset-0 rounded-full bg-green-500 opacity-20 animate-pulse'></div>
      <div className='absolute inset-2 rounded-full bg-green-400 opacity-40 animate-ping'></div>
      <div className='absolute inset-4 rounded-full bg-green-300 opacity-60 animate-spin'></div>
      <div className='absolute inset-6 rounded-full bg-green-200 opacity-80 animate-bounce'></div>
      <Leaf className='absolute inset-0 m-auto h-16 w-16 text-green-600 animate-pulse' />
    </div>
  );
}

export default function Home() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [impactData, setImpactData] = useState({
    wasteCollected: 0,
    reportsSubmitted: 0,
    tokensEarned: 0,
    co2Offset: 0,
  });

  useEffect(() => {
    async function fetchImpactData() {
      try {
        const reports = await getRecentReports(100); // Fetch last 100 reports
        const rewards = await getAllRewards();
        const tasks = await getWasteCollectionTasks(100); // Fetch last 100 tasks

        const wasteCollected = tasks.reduce((total, task) => {
          const match = task.amount.match(/(\d+(\.\d+)?)/);
          const amount = match ? parseFloat(match[0]) : 0;
          return total + amount;
        }, 0);

        const reportsSubmitted = reports.length;
        const tokensEarned = rewards.reduce(
          (total, reward) => total + (reward.points || 0),
          0
        );
        const co2Offset = wasteCollected * 0.5; // Assuming 0.5 kg CO2 offset per kg of waste

        setImpactData({
          wasteCollected: Math.round(wasteCollected * 10) / 10, // Round to 1 decimal place
          reportsSubmitted,
          tokensEarned,
          co2Offset: Math.round(co2Offset * 10) / 10, // Round to 1 decimal place
        });
      } catch (error) {
        console.error("Error fetching impact data:", error);
        // Set default values in case of error
        setImpactData({
          wasteCollected: 0,
          reportsSubmitted: 0,
          tokensEarned: 0,
          co2Offset: 0,
        });
      }
    }

    fetchImpactData();
  }, []);

  const login = () => {
    setLoggedIn(true);
  };

  return (
    <div
      className={`container mx-auto px-2 sm:px-4 py-8 sm:py-16 ${poppins.className}`}
    >
      <section className='text-center mb-12 sm:mb-20'>
        <AnimatedGlobe />
        <h1 className='text-4xl sm:text-6xl font-bold mb-4 sm:mb-6 text-gray-800 tracking-tight'>
          Eco Snap <span className='text-green-600'>Waste Management</span>
        </h1>
        <p className='text-lg sm:text-xl text-gray-600 max-w-xl sm:max-w-2xl mx-auto leading-relaxed mb-6 sm:mb-8'>
          Join our community in making waste management more efficient and
          rewarding!
        </p>
        {!loggedIn ? (
          <Button
            onClick={login}
            className='bg-green-600 hover:bg-green-700 text-white text-base sm:text-lg py-4 sm:py-6 px-6 sm:px-10 rounded-full font-medium transition-all duration-300 ease-in-out transform hover:scale-105'
          >
            Get Started
            <ArrowRight className='ml-2 h-4 w-4 sm:h-5 sm:w-5' />
          </Button>
        ) : (
          <Link href='/reports'>
            <Button className='bg-green-600 hover:bg-green-700 text-white text-base sm:text-lg py-4 sm:py-6 px-6 sm:px-10 rounded-full font-medium transition-all duration-300 ease-in-out transform hover:scale-105'>
              Report Waste
              <ArrowRight className='ml-2 h-4 w-4 sm:h-5 sm:w-5' />
            </Button>
          </Link>
        )}
      </section>

      <section className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-10 mb-12 sm:mb-20'>
        <FeatureCard
          icon={Leaf}
          title='Eco-Friendly'
          description='Contribute to a cleaner environment by reporting and collecting waste.'
        />
        <FeatureCard
          icon={Coins}
          title='Earn Rewards'
          description='Get tokens for your contributions to waste management efforts.'
        />
        <FeatureCard
          icon={Users}
          title='Community-Driven'
          description='Be part of a growing community committed to sustainable practices.'
        />
      </section>

      <section className='bg-white p-6 sm:p-10 rounded-2xl sm:rounded-3xl shadow-lg mb-12 sm:mb-20'>
        <h2 className='text-3xl sm:text-4xl font-bold mb-8 sm:mb-12 text-center text-gray-800'>
          Our Impact
        </h2>
        <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6'>
          <ImpactCard
            title='Waste Collected'
            value={`${impactData.wasteCollected} kg`}
            icon={Recycle}
          />
          <ImpactCard
            title='Reports Submitted'
            value={impactData.reportsSubmitted.toString()}
            icon={MapPin}
          />
          <ImpactCard
            title='Tokens Earned'
            value={impactData.tokensEarned.toString()}
            icon={Coins}
          />
          <ImpactCard
            title='CO2 Offset'
            value={`${impactData.co2Offset} kg`}
            icon={Leaf}
          />
        </div>
      </section>
    </div>
  );
}

function ImpactCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
}) {
  const formattedValue =
    typeof value === "number"
      ? value.toLocaleString("en-US", { maximumFractionDigits: 1 })
      : value;

  return (
    <div className='p-6 rounded-lg bg-white border border-gray-200 shadow-sm transition-all duration-300 ease-in-out hover:shadow-lg'>
      <Icon className='h-10 w-10 text-blue-600 mb-4' />
      <p className='text-3xl font-semibold mb-2 text-gray-900'>
        {formattedValue}
      </p>
      <p className='text-sm text-gray-500'>{title}</p>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className='bg-white p-8 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 ease-in-out flex flex-col items-center text-center space-y-6'>
      <div className='bg-blue-100 p-5 rounded-full'>
        <Icon className='h-9 w-9 text-blue-600' />
      </div>
      <div className='flex flex-col items-center space-y-3'>
        <h3 className='text-2xl font-bold text-gray-900'>{title}</h3>
        <p className='text-gray-600 text-base'>{description}</p>
      </div>
    </div>
  );
}
