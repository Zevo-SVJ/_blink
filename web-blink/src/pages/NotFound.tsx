import { useNavigate } from "react-router-dom";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <div
        className="fixed inset-0 -z-10"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 0%, hsl(220 70% 14%) 0%, hsl(220 84% 10%) 40%, hsl(220 80% 8%) 100%)",
        }}
      />
      <h1 className="mb-4 text-5xl font-extrabold tracking-tight text-white sm:text-6xl">
        This page blinked away.
      </h1>
      <p className="mb-8 text-base text-white/50 sm:text-lg">
        The page you're looking for doesn't exist.
      </p>
      <button
        type="button"
        onClick={() => navigate("/")}
        className="rounded-2xl bg-blink-sky px-6 py-3 text-sm font-bold text-blink-navy transition-all hover:scale-[1.02]"
      >
        Back to Blink
      </button>
    </div>
  );
};

export default NotFound;
