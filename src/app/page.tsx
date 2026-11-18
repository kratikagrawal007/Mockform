import { EditorShell } from "@/components/editor/EditorShell";
import { SmallScreenNotice } from "@/components/editor/SmallScreenNotice";

export default function Home() {
  return (
    <>
      <SmallScreenNotice />
      <EditorShell />
    </>
  );
}
