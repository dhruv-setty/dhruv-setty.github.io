import { useRef } from "react";
import Icon from "./Icon";

// "Learn more" button that opens a native dialog with the full description and its links.
export default function LearnMore({ title, icon, kicker, body, links }: {
  title: string; icon: string; kicker?: string; body: string;
  links: { label: string; href: string; internal?: boolean }[];
}) {
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button type="button" className="learn-more" onClick={() => ref.current?.showModal()}>Learn more</button>
      <dialog ref={ref} className="lm-dialog" aria-label={title} onClick={(e) => { if (e.target === ref.current) ref.current?.close(); }}>
        <div className="lm-dialog__inner">
          <div className="lm-dialog__head">
            <span className="icon-tile icon-tile--sm"><Icon name={icon} /></span>
            <div>
              {kicker ? <p className="lm-dialog__kicker">{kicker}</p> : null}
              <h3 className="lm-dialog__title">{title}</h3>
            </div>
            <button type="button" className="lm-dialog__close" onClick={() => ref.current?.close()} aria-label="Close">×</button>
          </div>
          <p className="lm-dialog__body">{body}</p>
          {links.length ? (
            <p className="lm-dialog__links">
              {links.map((l) => (
                <a key={l.href} className="btn" href={l.href} {...(l.internal ? {} : { target: "_blank", rel: "noopener" })}>{l.label}{l.internal ? "" : " ↗"}</a>
              ))}
            </p>
          ) : null}
        </div>
      </dialog>
    </>
  );
}
