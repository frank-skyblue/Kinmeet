import { Image, Text, View } from 'react-native';
import { getPhotoUrl } from '../../services/api';

type AvatarProps = {
  firstName: string;
  photo?: string;
  /** Diameter in points. */
  size?: number;
};

/** Round profile photo, or the first initial on coral when there is no photo. */
export const Avatar = ({ firstName, photo, size = 56 }: AvatarProps) => {
  const style = { width: size, height: size, borderRadius: size / 2 };

  if (photo) {
    return (
      <Image
        source={{ uri: getPhotoUrl(photo) }}
        accessibilityIgnoresInvertColors
        accessible={false}
        style={style}
        className="bg-kin-beige"
      />
    );
  }

  return (
    <View style={style} className="items-center justify-center bg-kin-coral" accessible={false}>
      <Text className="font-bold text-white" style={{ fontSize: size * 0.4 }}>
        {firstName.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
};
