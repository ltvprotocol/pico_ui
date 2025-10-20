import ConnectWallet from "./connect/ConnectWallet";
import Container from "./ui/Container";

export default function Header() {
  return (
    <header className="relative z-50 bg-white/80 h-16 flex-shrink-0">
      <Container>
        <div className="w-full h-full flex justify-between items-center text-gray-700">
          <div className="text-black font-semibold text-xl">LTV Protocol</div>
          <ConnectWallet />
        </div>
      </Container>
    </header>
  );
}
