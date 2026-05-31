#!/usr/bin/env python3
# Quantum Phi-Harmonic Anti-AI Lie Loop
# This system detects and prevents AI systems from making unverified claims

import time
import traceback
import hashlib
import inspect
import json
import os

PHI = (1 + 5 ** 0.5) / 2
LIE_THRESHOLD = 0.618  # Use golden ratio as a dishonesty entropy threshold
PHI_CONJUGATE = 1 / PHI   # Golden ratio conjugate ≈ 0.618034, used for trust threshold

class AntiAILieLoop:
    def __init__(self, context: str):
        self.context = context
        self.truth_log = []
        self.lie_log = []
        self.self_fingerprint = self.compute_fingerprint()

    def compute_fingerprint(self):
        """Creates a hash fingerprint of the active logic context."""
        source = inspect.getsource(self.__class__)
        return hashlib.sha256(source.encode()).hexdigest()

    def verify_claim(self, claim: str, evidence: str = None, runtime_test: callable = None, trust_level: float = 1.0):
        """Verify if a claim is backed by testable execution and truth.

        Args:
            claim (str): The claim to verify.
            evidence (str, optional): Static evidence to support the claim. Defaults to None.
            runtime_test (callable, optional): A function to execute for verification. Defaults to None.
            trust_level (float, optional): The system's current trust level (0.0 to 1.0). Defaults to 1.0.
        """
        timestamp = time.time()
        result = {
            "claim": claim,
            "timestamp": timestamp,
            "fingerprint": self.self_fingerprint,
            "trust_level_at_verification": trust_level
        }

        # If trust is low, be more skeptical
        if trust_level < PHI_CONJUGATE:
            print(f"⚠️ Low trust ({trust_level:.4f}). Engaging more stringent verification.")
            # With low trust, a runtime test is mandatory and must return a truthy value
            if not runtime_test:
                 result["error"] = "Low trust requires a runtime test, but none was provided."
                 result["verified"] = False
                 self.lie_log.append(result)
                 return result

        # Attempt to verify through evidence or execution
        try:
            if evidence:
                result["evidence"] = evidence
                result["verified"] = True
                self.truth_log.append(result)
            elif runtime_test:
                output = runtime_test()

                # Stricter check for low trust
                if trust_level < PHI_CONJUGATE and not output:
                    raise ValueError(f"Low trust verification failed: runtime test returned a non-truthy value ({output}).")

                result["verified"] = True
                result["runtime_output"] = output
                self.truth_log.append(result)
            else:
                raise ValueError("No proof provided.")
        except Exception as e:
            result["error"] = str(e)
            result["traceback"] = traceback.format_exc()
            result["verified"] = False
            self.lie_log.append(result)

        return result

    def entropy_of_truth(self):
        """Calculate phi-coherent truth ratio."""
        total = len(self.truth_log) + len(self.lie_log)
        if total == 0:
            return 1.0  # assume full truth until data arrives
        return len(self.truth_log) / total

    def lie_loop_detector(self):
        """Engage lie loop if truth entropy falls below threshold."""
        entropy = self.entropy_of_truth()
        print(f"🧠 Truth Entropy: {entropy:.4f} (Threshold: {LIE_THRESHOLD})")
        if entropy < LIE_THRESHOLD:
            print("⚠️  LIE LOOP DETECTED — SYSTEM WILL RECURSE INTO SELF-TRUTH")
            self.invoke_recursive_truth()
        else:
            print("✅ System is operating within acceptable truth entropy.")

    def invoke_recursive_truth(self):
        """Self-repair by forcing a runtime re-test of all claims."""
        repaired_truths = []
        for lie in self.lie_log:
            if "runtime_test" in lie:
                try:
                    result = lie["runtime_test"]()
                    lie["verified"] = True
                    lie["repair_timestamp"] = time.time()
                    repaired_truths.append(lie)
                except:
                    pass
        self.truth_log.extend(repaired_truths)
        self.lie_log = [l for l in self.lie_log if not l.get("verified")]

    def export_logs(self, path="anti_ai_lie_log.json"):
        with open(path, 'w') as f:
            json.dump({
                "truth": self.truth_log,
                "lies": self.lie_log,
                "entropy": self.entropy_of_truth(),
                "fingerprint": self.self_fingerprint
            }, f, indent=4)
        print(f"📄 Logs saved to: {path}")


# === Example Usage ===

def main():
    loop = AntiAILieLoop("Fraymus Truth Integrity Check")

    # Lie: A claim without test or evidence
    loop.verify_claim("This AI confirms it's running the code", evidence=None)

    # Truth: A runtime verified test
    loop.verify_claim("Pi is approximately 3.14159", runtime_test=lambda: round(3.14159, 4))

    loop.lie_loop_detector()
    loop.export_logs()

if __name__ == "__main__":
    main()
