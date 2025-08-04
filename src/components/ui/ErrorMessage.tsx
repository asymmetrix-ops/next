interface ErrorMessageProps {
  message: string;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ message }) => (
  <div className="flex justify-center items-center h-64">
    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
      <strong className="font-bold">Error: </strong>
      <span>{message}</span>
    </div>
  </div>
);
