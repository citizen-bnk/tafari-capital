import Link from "next/link";
export default function NotFound() {
  return (
    <div className="wrap section empty">
      <p className="eyebrow">404</p>
      <h1>This page could not be found.</h1>
      <Link className="btn dark" href="/">
        Return home
      </Link>
    </div>
  );
}
