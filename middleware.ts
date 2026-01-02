import { withAuth } from "next-auth/middleware";

export default withAuth(
  function middleware(req) {
    // aqui não precisa fazer nada
  },
  {
    callbacks: {
      authorized: ({ token }) => {
        // só entra se estiver logado
        return !!token;
      },
    },
  }
);

// quais rotas devem ser protegidas
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/clientes/:path*",
    "/facturas/:path*",
    "/presupuestos/:path*",
    "/servicios/:path*",
    "/settings/:path*",
    "/workspaces/:path*",
  ],
};
