// 파일: Navbar.tsx
import Navigation from './Navigation';

const DeprecatedNavbar = (props: any) => {
  console.warn("Navbar.tsx is deprecated. Use Navigation instead.");
  return <Navigation transparent {...props} />;
};

export default DeprecatedNavbar;