import FireteamsList from "@/components/FireteamsList";

export default function FireteamsPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Your Fireteams</h1>
      <FireteamsList />
    </div>
  );
}
