import { type FormEvent, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '@/entities/session';

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
      navigate('/categories', { replace: true });
      return;
    }

    setSubmitError(result.error ?? 'Не удалось выполнить вход.');
    setIsSubmitting(false);
    focusField('login');
  };

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="login-title">
        <div className="auth-copy">
          <span className="auth-kicker">Webman CMS</span>
          <h1 id="login-title" className="auth-title">
            Вход в панель управления
          </h1>
          <p className="auth-description">Используйте логин и пароль, чтобы войти в защищенную админ-панель.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label className="field-label" htmlFor="login">
              Логин
            </label>
            <input
              ref={loginRef}
              id="login"
              name="login"
              type="text"
              className="field-input"
              autoComplete="username"
              value={values.login}
              onChange={(event) => handleChange('login', event.target.value)}
              aria-invalid={Boolean(errors.login)}
              aria-describedby={errors.login ? 'login-error' : undefined}
            />
            {errors.login ? (
              <p id="login-error" className="field-error" role="alert">
                {errors.login}
              </p>
            ) : null}
          </div>

          <div className="field">
            <label className="field-label" htmlFor="password">
              Пароль
            </label>
            <input
              ref={passwordRef}
              id="password"
              name="password"
              type="password"
              className="field-input"
              autoComplete="current-password"
              value={values.password}
              onChange={(event) => handleChange('password', event.target.value)}
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? 'password-error' : undefined}
            />
            {errors.password ? (
              <p id="password-error" className="field-error" role="alert">
                {errors.password}
              </p>
            ) : null}
          </div>

          {submitError ? (
            <p className="form-error" role="alert">
              {submitError}
            </p>
          ) : null}

          <button type="submit" className="submit-button" disabled={isSubmitting}>
            {isSubmitting ? 'Вход...' : 'Войти'}
          </button>
        </form>
      </section>
    </main>
  );
}
