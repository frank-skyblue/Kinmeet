import { useEffect } from 'react';

interface FunctionProps {
	imageSource: string;
	isOpen: boolean;
	onClose: () => void;
}

export default function ProfilePictureModal({
	imageSource,
	isOpen,
	onClose,
}: FunctionProps) {
	// If the length is under 2 characters long, it is not an actual image. Instead it is the default avatar
	const isActualImage = imageSource.length > 2;

	// Side effect to close the profile picture on 'Escape' key press
	useEffect(
		function () {
			document.addEventListener('keydown', function (e) {
				if (e.code === 'Escape' || e.key === 'Escape') {
					onClose();
				}
			});

			return () =>
				document.removeEventListener('keydown', function (e) {
					if (e.code === 'Escape' || e.key === 'Escape') {
						onClose();
					}
				});
		},
		[onClose],
	);

	return (
		<div
			className={`fixed inset-0 bg-black/50 z-50 p-4 flex items-center justify-center ${isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
			onClick={() => onClose()}
		>
			<button
				className="absolute right-4 top-4 bg-white text-4xl px-2.5 rounded-full hover:cursor-pointer"
				onClick={() => onClose()}
			>
				&times;
			</button>

			<div
				className="bg-white h-3/4 w-1/2 rounded-md overflow-hidden max-md:w-full"
				onClick={(e) => {
					e.preventDefault();
					e.stopPropagation();
				}}
			>
				{isActualImage ? (
					<img
						src={imageSource}
						className="w-full h-full object-cover object-top"
						alt="Profile Picture"
					/>
				) : (
					<div className="w-full h-full flex items-center justify-center bg-linear-to-br from-kin-coral to-kin-teal text-white">
						<h3 className="text-[10rem] pointer-events-none">{imageSource}</h3>
					</div>
				)}
			</div>
		</div>
	);
}
