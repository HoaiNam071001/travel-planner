// Header chuẩn cho các trang danh sách: icon nổi + tiêu đề + phụ đề + actions.
export default function PageHeader({ icon: Icon, title, subtitle, actions, children }) {
  return (
    <div className="mb-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3.5">
          {Icon && (
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-[0_4px_12px_-2px_rgb(6_182_212_/_0.5)]">
              <Icon className="h-5 w-5" />
            </div>
          )}
          <div>
            <h1 className="text-[22px] font-bold leading-tight">{title}</h1>
            {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
          </div>
        </div>

        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>

      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}
