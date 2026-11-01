import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import StoreShell from "./components/StoreShell";
import { CartProvider } from "./contexts/CartContext";

const AdminPage = lazy(() => import("./pages/Admin"));
const CartPage = lazy(() => import("./pages/Cart"));
const CollectionPage = lazy(() => import("./pages/Collection"));
const Home = lazy(() => import("./pages/Home"));
const ProductPage = lazy(() => import("./pages/Product"));

function Routes() {
  return (
    <Suspense fallback={<div className="page-loading">Preparing the edit…</div>}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/collections/:slug">{(params) => <CollectionPage slug={params.slug} />}</Route>
        <Route path="/products/:slug">{(params) => <ProductPage slug={params.slug} />}</Route>
        <Route path="/bag" component={CartPage} />
        <Route path="/admin" component={AdminPage} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <CartProvider>
        <TooltipProvider>
          <Toaster position="top-center" />
          <StoreShell><Routes /></StoreShell>
        </TooltipProvider>
      </CartProvider>
    </ErrorBoundary>
  );
}
