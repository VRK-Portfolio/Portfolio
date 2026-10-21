'use client';
import Link from "next/link"
import './Header.css';
import Button from "@/block/ui/button/Button";
import { useState, useSyncExternalStore } from "react";
import { Menu, Moon, Sun, X } from "lucide-react";

const subscribeToTheme = (onChange: () => void) => {
    const observer = new MutationObserver(onChange);
    observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme'],
    });
    return () => observer.disconnect();
};

const getThemeSnapshot = () => document.documentElement.getAttribute('data-theme') === 'dark';
const getServerThemeSnapshot = () => false;

const HeaderComponent = ({ className }: { className?: string }) => {

    const [isMenuVisible, setIsMenuVisible] = useState(false);
    const isDarkTheme = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, getServerThemeSnapshot);
    const showHideMenu = () => {
        setIsMenuVisible(!isMenuVisible);
    };
    const changeTheme = () => {
        document.documentElement.setAttribute('data-theme', getThemeSnapshot() ? 'light' : 'dark');
    };
    return (
        <>
            <header className={`cmp-header ${className ? className : ''}`}>
                <div className="container flex justify-between items-center">
                    <div className="cmp-header__logo">
                        <Link href="#">
                            <p>Vijay Rameshkumar</p>
                        </Link>
                    </div>
                    <div className="cmp-header__menu">
                        <nav className={`cmp-header__nav ${isMenuVisible ? '' : 'hidden'} lg:block`}>
                            <ul>
                                <li>
                                    <Link href=''>Home</Link>
                                </li>
                                <li>
                                    <Link href=''>Skills</Link>
                                </li>
                                <li>
                                    <Link href=''>Experience</Link>
                                </li>
                                <li>
                                    <Link href=''>Certifications</Link>
                                </li>
                                <li>
                                    <Link href=''>Works</Link>
                                </li>
                                <li>
                                    <Link href=''>Blogs</Link>
                                </li>
                            </ul>
                        </nav>
                        <Button onClick={() => changeTheme()} className="cmp-header__theme" variant="ghost" rounded>

                            {
                                isDarkTheme ? <Sun className="size-4" /> : <Moon className="size-4" />
                            }

                        </Button>
                    </div>
                    <Button className="cmp-header__hamburger lg:hidden" onClick={showHideMenu} variant="ghost">
                        {
                            isMenuVisible ? <>
                                <X className="size-4" />
                                <span className="sr-only">Close Menu</span>
                            </> : <>
                                <Menu className="size-4" />
                                <span className="sr-only">Open Menu</span>
                            </>
                        }

                    </Button>
                </div>
            </header>
        </>
    )
}
export default HeaderComponent;
