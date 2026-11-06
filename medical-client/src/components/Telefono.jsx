import PhoneInput from 'react-phone-number-input';
import flags from 'react-phone-number-input/flags';
import 'react-phone-number-input/style.css';

/** Campo de teléfono internacional con Chile como país predeterminado. */
export default function Telefono({ value, onChange, defaultCountry = 'CL' }) {
  return (
    <PhoneInput
      international
      flags={flags}
      countryCallingCodeEditable={false}
      defaultCountry={defaultCountry}
      value={value || undefined}
      onChange={(numero) => onChange(numero || '')}
      placeholder="Ingresa el número"
    />
  );
}
