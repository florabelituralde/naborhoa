import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";

// If the visitor already has a valid session, send them straight to the app
// instead of showing the login/register form. Uses auth.me() (not just a
// token-presence check) so an expired/invalid token won't cause a redirect loop.
export default function useRedirectIfAuthed(to = "/") {
  const navigate = useNavigate();
  useEffect(() => {
    let active = true;
    base44
      .auth
      .me()
      .then((u) => {
        if (active && u) navigate(to, { replace: true });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [navigate, to]);
}