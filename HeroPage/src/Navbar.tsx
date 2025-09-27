import poly from "./assets/poly-1.png";
import self from "./assets/self.jpg";
import logo from "./assets/icon.png";
const Navbar = () => {
  return (
    <nav className="fixed inset-x-0 top-0 z-50 bg-black/80 backdrop-blur border-b border-white/10">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 text-white">
        <div className="flex items-center gap-3">
          <img src={logo} alt="PyREX logo" className="h-8 w-8" />
          <span className="text-2xl font-bold tracking-tight">PyREX</span>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2 text-neutral-300">
            <span>Built on</span>
            <img src={poly} alt="Polygon" className="h-8 w-8" />
          </div>
          <div className="hidden h-5 w-px bg-white/20 sm:block" />
          <div className="flex items-center gap-2 text-neutral-300">
            <span>Authentication by</span>
            <img
              src={self}
              alt="Self Protocol"
              className="h-8 w-8 rounded-full object-cover"
            />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

