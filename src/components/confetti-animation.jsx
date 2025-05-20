import { useState, useEffect } from 'react';
import Confetti from 'react-confetti';

export function ConfettiAnimation() {
    const [windowSize, setWindowSize] = useState({
        width: typeof window !== 'undefined' ? window.innerWidth : 0,
        height: typeof window !== 'undefined' ? window.innerHeight : 0,
    });

    useEffect(() => {
        const handleResize = () => {
            setWindowSize({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <Confetti
            width={windowSize.width}
            height={windowSize.height}
            recycle={false}
            numberOfPieces={200}
            gravity={0.3}
            initialVelocityY={10}
            tweenDuration={1000}
            style={{ position: 'fixed', top: 0, left: 0, zIndex: 9999 }}
        />
    );
} 