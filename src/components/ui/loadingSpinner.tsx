import "./loadingSpinner.css"

export default function LoadingSpinner() {
    const size = 200;

    return (
        <div className="container">
            <svg className="circle-svg" height={size} width={size}>
                <circle cx={size / 2} cy={size / 2} r={size / 4}></circle>
            </svg>
        </div>
    )
}