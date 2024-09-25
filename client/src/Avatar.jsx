/* eslint-disable react/prop-types */
export default function Avatar({ username }) {
  return (
    <div>
      <div className="w-8 h-8 bg-red-200 rounded-full flex items-center">
        <div className="text-center w-full opacity-70">{username[0]}</div>
      </div>
    </div>
  );
}
