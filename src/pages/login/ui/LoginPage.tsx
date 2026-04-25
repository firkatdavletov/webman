import { type FormEvent, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '@/entities/session';
import { AdminNotice, Badge, Button, Card, CardContent, CardHeader, CardTitle, FormField, Input } from '@/shared/ui';

type FieldName = 'login' | 'password';

type FormValues = {
  login: string;
  password: string;
};

type FormErrors = Partial<Record<FieldName, string>>;

const emptyValues: FormValues = {
  login: '',
  password: '',
};

function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {};

  if (!values.login.trim()) {
    errors.login = 'Укажите логин.';
  }

  if (!values.password) {
    errors.password = 'Укажите пароль.';
  }

  return errors;
}

export function LoginPage() {
  const navigate = useNavigate();
  const loginRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [values, setValues] = useState<FormValues>(emptyValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loginRef.current?.focus();
  }, []);

  const focusField = (field: FieldName) => {
    if (field === 'login') {
      loginRef.current?.focus();
      return;
    }

    passwordRef.current?.focus();
  };

  const handleChange = (field: FieldName, nextValue: string) => {
    setValues((currentValues) => ({
      ...currentValues,
      [field]: nextValue,
    }));

    setErrors((currentErrors) => {
      if (!currentErrors[field]) {
        return currentErrors;
      }

      return {
        ...currentErrors,
        [field]: undefined,
      };
    });

    if (submitError) {
      setSubmitError('');
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors = validate(values);

    if (nextErrors.login) {
      setErrors(nextErrors);
      focusField('login');
      return;
    }

    if (nextErrors.password) {
      setErrors(nextErrors);
      focusField('password');
      return;
    }

    setErrors({});
    setSubmitError('');
    setIsSubmitting(true);

    const result = await login(values.login.trim(), values.password);

    if (result.token) {
      navigate('/dashboard', { replace: true });
      return;
    }

    setSubmitError(result.error ?? 'Не удалось выполнить вход.');
    setIsSubmitting(false);
    focusField('login');
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 sm:px-6 lg:px-8">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(17,117,108,0.18),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(16,34,40,0.18),transparent_28%)]"
        aria-hidden="true"
      />

      <div className="relative grid w-full max-w-6xl gap-6 lg:grid-cols-[1.05fr_minmax(22rem,30rem)]">
        <section className="hidden rounded-[2rem] border border-sidebar-border bg-sidebar px-8 py-9 text-sidebar-foreground shadow-[0_28px_80px_rgba(12,35,39,0.24)] lg:flex lg:flex-col lg:justify-between">
          <div className="space-y-5">
            <Badge className="w-fit rounded-full bg-sidebar-primary px-3 py-1 text-sidebar-primary-foreground hover:bg-sidebar-primary">
              Storeva
            </Badge>
            <div className="space-y-3">
              <p className="text-xs font-semibold tracking-[0.24em] text-sidebar-foreground/65 uppercase">
                Панель управления
              </p>
              <h1 className="font-heading text-4xl leading-tight font-semibold tracking-tight">Управляйте каталогом и контентом из одного интерфейса.</h1>
              <p className="max-w-lg text-base leading-7 text-sidebar-foreground/72">
                Новая панель управления создана, чтобы сайт было проще поддерживать и развивать.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1.5rem] border border-sidebar-border bg-sidebar-accent/70 p-4">
              <p className="text-sm font-semibold">Импорт каталога</p>
              <p className="mt-2 text-sm leading-6 text-sidebar-foreground/70">Позволяет импортировать каталог с помощью таблиц CSV</p>
            </div>
            <div className="rounded-[1.5rem] border border-sidebar-border bg-sidebar-accent/70 p-4">
              <p className="text-sm font-semibold">Удобство</p>
              <p className="mt-2 text-sm leading-6 text-sidebar-foreground/70">Позволяет быстро редактировать контент.</p>
            </div>
          </div>
        </section>

        <Card
          className="rounded-[2rem] border border-border/70 bg-card/92 py-0 shadow-[0_28px_80px_rgba(12,35,39,0.14)] backdrop-blur-md"
          aria-labelledby="login-title"
        >
          <CardHeader className="gap-3 border-b border-border/70 px-6 py-6 sm:px-8 sm:py-8">
            <Badge variant="secondary" className="w-fit rounded-full px-3 py-1 text-[0.72rem] tracking-[0.16em] uppercase">
              Webman CMS
            </Badge>
            <div className="space-y-2">
              <CardTitle id="login-title" className="text-3xl font-semibold tracking-tight">
                Вход в панель управления
              </CardTitle>
              <p className="max-w-md text-sm leading-6 text-muted-foreground">
                Используйте логин и пароль, чтобы войти в защищенную админ-панель и продолжить работу с каталогом.
              </p>
            </div>
          </CardHeader>

          <CardContent className="px-6 py-6 sm:px-8 sm:py-8">
            <form className="grid gap-5" onSubmit={handleSubmit} noValidate>
              <FormField error={errors.login} htmlFor="login" label="Логин">
                <Input
                  ref={loginRef}
                  id="login"
                  name="login"
                  type="text"
                  className="h-11 rounded-xl bg-background/80 shadow-sm"
                  autoComplete="username"
                  value={values.login}
                  onChange={(event) => handleChange('login', event.target.value)}
                  aria-invalid={Boolean(errors.login)}
                  aria-describedby={errors.login ? 'login-error' : undefined}
                />
              </FormField>

              <FormField error={errors.password} htmlFor="password" label="Пароль">
                <Input
                  ref={passwordRef}
                  id="password"
                  name="password"
                  type="password"
                  className="h-11 rounded-xl bg-background/80 shadow-sm"
                  autoComplete="current-password"
                  value={values.password}
                  onChange={(event) => handleChange('password', event.target.value)}
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                />
              </FormField>

              {submitError ? (
                <AdminNotice tone="destructive" role="alert">
                  {submitError}
                </AdminNotice>
              ) : null}

              <Button type="submit" size="lg" className="mt-2 h-11 rounded-xl shadow-sm" disabled={isSubmitting}>
                {isSubmitting ? 'Вход...' : 'Войти'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
