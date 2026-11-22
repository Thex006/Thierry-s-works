import Nav from "@/components/Nav";
import Stage from "@/components/Stage";
import Sections from "@/components/Sections";
import SmoothScroll from "@/components/SmoothScroll";

export default function Home() {
  return (
    <>
      <SmoothScroll />
      <Nav />
      <main id="main">
        <Stage />
        <Sections />
      </main>
    </>
  );
}
