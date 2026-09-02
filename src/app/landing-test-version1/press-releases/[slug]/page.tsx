import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function PressReleasePage({ params }: PageProps) {
  await params;
  redirect("/landing-test-version1/press-releases");
}
