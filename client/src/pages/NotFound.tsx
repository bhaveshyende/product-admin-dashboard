import { ArrowLeft, Compass } from "lucide-react";
import { useLocation } from "wouter";
import { Button, StatusMessage } from "../components/ui";

export function NotFound() {
  const [, navigate] = useLocation();
  return <div className="flex min-h-[65vh] items-center justify-center"><StatusMessage icon={<Compass className="h-5 w-5" />} title="This page wandered off" copy="The route you’re looking for doesn’t exist in this workspace." action={<Button tone="soft" onClick={() => navigate("/")}><ArrowLeft className="h-4 w-4" /> Back to overview</Button>} /></div>;
}

export default NotFound;
