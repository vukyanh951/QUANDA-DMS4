import { QuandaApp } from "@/src/components/QuandaApp";

export default function Home() {
  return <QuandaApp demoMode={!process.env.DASHSCOPE_API_KEY} />;
}
