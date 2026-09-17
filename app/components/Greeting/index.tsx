import { type ComponentProps, useEffect, useState } from "react";

function useCurrentSecond() {
  const [date, setDate] = useState(() => new Date());
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      setDate(new Date());
      const delay = 1000 - new Date().getMilliseconds();
      timer = setTimeout(tick, delay);
    };
    tick();
    return () => clearTimeout(timer);
  }, []);
  return date;
}

export default function Greeting({
  helloStr = "喵 >w< ~",
  children,
  ...restProps
}: { helloStr?: string } & ComponentProps<"div">) {
  const currentDate = useCurrentSecond();
  return (
    <div {...restProps}>
      <div className="flex flex-col gap-4">
        <div className="flex gap-4">
          {/* 日期 */}
          <span className="text-2xl flex-none">
            {currentDate.toLocaleDateString()}
          </span>
          {/* 星期 */}
          <span className="flex-none">
            <span className="text-2xl">星期</span>
            <span className="text-primary-foreground text-2xl font-bold">
              {["天", "一", "二", "三", "四", "五", "六"][currentDate.getDay()]}
            </span>
          </span>
          {/* 时间 */}
          <span className="flex-none text-primary-foreground text-2xl font-bold">
            {currentDate.toLocaleTimeString()}
          </span>
        </div>

        {/* 问候语 */}
        <div className="flex-none whitespace-nowrap text-6xl font-bold">
          {helloStr}
        </div>
      </div>
    </div>
  );
}
