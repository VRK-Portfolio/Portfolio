'use client';
import Link from "next/link"
import './Header.css';
import Button from "@/block/ui/button/Button";
import { useEffect, useState, useSyncExternalStore } from "react";
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
    useEffect(() => {
        try {
            const theme = window.localStorage.getItem('theme');
            if (theme === 'light' || theme === 'dark') {
                document.documentElement.setAttribute('data-theme', theme);
            }
        } catch {
            console.warn('Theme preference could not be loaded from localStorage.');
        }
    }, []);

    const showHideMenu = () => {
        setIsMenuVisible(!isMenuVisible);
    };
    const changeTheme = () => {
        const theme = getThemeSnapshot() ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', theme);
        try {
            window.localStorage.setItem('theme', theme);
        } catch {
            console.warn('Theme preference could not be saved to localStorage.');
        }
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
                                    <Link href='/#'>Home</Link>
                                </li>
                                <li>
                                    <Link href='/#Skills'>Skills</Link>
                                </li>
                                <li>
                                    <Link href='/#Experience'>Experience</Link>
                                </li>
                                <li>
                                    <Link href='/#Certifications'>Certifications</Link>
                                </li>
                                {/* <li>
                                    <Link href=''>Works</Link>
                                </li> */}
                                <li>
                                    <Link href='/#Blogs'>Blogs</Link>
                                </li>
                            </ul>
                        </nav>
                        <Button onClick={() => changeTheme()} className="cmp-header__theme" variant="ghost" rounded
                            aria-label={isDarkTheme ? "Switch to light mode" : "Switch to dark mode"}>

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
