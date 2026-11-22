import Plain from "@/components/Plain";

export const metadata = { title: "Credits | Handyman Services in Columbus" };

const models = [
  "Pipe Wrench", "Hand Plane No4", "Trowel 01", "Combination Wrench", "Wooden Hammer 01", "Flathead Screwdriver",
  "Adjustable Wrench", "Drill 01", "Measuring Tape 01", "Tongue Groove Pliers", "Screwdriver", "Pliers", "Handsaw Wood",
];

export default function Credits() {
  return (
    <Plain eyebrow="Credits" title="Credits">
      <p>
        3D tools: photo scanned models from <a className="underline" href="https://polyhaven.com/models">Poly Haven</a>, CC0: {models.join(", ")}.
      </p>
      <p>Plywood texture and studio lighting (studio_small_08): Poly Haven, CC0.</p>
      <p>Columbus skyline at dusk: Carol M. Highsmith, Library of Congress, public domain, via Wikimedia Commons.</p>
      <p>Concept demo by Kitebright Studio. Not the live website of the business.</p>
    </Plain>
  );
}
