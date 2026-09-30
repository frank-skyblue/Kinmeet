import { useNavigate } from 'react-router-dom';

export default function BackButton() {
	const navigate = useNavigate();

	return (
		<>
			<button
				className="bg-primary text-primary-foreground shadow-kin-soft transition hover:shadow-kin-medium font-medium flex items-center justify-start gap-x-1 p-2 text-sm rounded-kin-sm hover:bg-primary-hover hover:cursor-pointer"
				onClick={() => navigate(-1)}
			>
				<span>
					<svg
						className="h-3.5 w-3.5"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						aria-label="Back Button"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
						/>
					</svg>
				</span>

				<span>Back</span>
			</button>
		</>
	);
}
