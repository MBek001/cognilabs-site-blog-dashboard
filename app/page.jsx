"use client";

import { useEffect } from "react";
import { useIsAdminMutation } from "../redux/api/authApi";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [isAdmin] = useIsAdminMutation();

  useEffect(() => {
    const check = async () => {
      try {
        const res = await isAdmin().unwrap();
        console.log("Admin result:", res);

        router.push("/dashboard");  // <-- TO‘G‘RI
      } catch (err) {
        console.log("Admin error:", err);

        router.push("/login");  // <-- TO‘G‘RI
      }
    };

    check();
  }, [isAdmin, router]);

  return <div>Loading...</div>;
}
