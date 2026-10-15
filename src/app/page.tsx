import { redirect } from "next/navigation";

// Root forwards to the dashboard; middleware handles the auth bounce to /login.
export default function Home() {
  redirect("/dashboard");
}
