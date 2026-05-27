import { redirect } from "next/navigation";

export default function CreatePage({ searchParams }: { searchParams: { edit?: string } }) {
  const edit = searchParams.edit;
  redirect(edit ? `/map?edit=${edit}` : "/map");
}
