import React from "react";
import { Button, Container, Html, Text } from "@react-email/components";

export type MagicLinkEmailProps = {
  loginUrl: string;
};

export function MagicLinkEmail({ loginUrl }: MagicLinkEmailProps) {
  return (
    <Html>
      <Container>
        <Text>Click the button below to log in:</Text>
        <Button href={loginUrl}>Log in</Button>
        <Text>This link expires in 15 minutes.</Text>
        <Text>If you didn&apos;t request this email, you can safely ignore it.</Text>
      </Container>
    </Html>
  );
}
