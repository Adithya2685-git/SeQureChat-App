from qiskit import QuantumCircuit, QuantumRegister, ClassicalRegister
from qiskit_aer import AerSimulator
from qiskit import transpile


#basis gates qubit pairs for ALice and Bob Each
# if 4096 then 4096 for alice and bob

    #Aer simulate it for number of qubits required size
    # Shots = qubits /4
def measure(circuits,shots):
    simulator= AerSimulator()

    # Ensure `circuits` is a list
    if not isinstance(circuits, list):
        circuits = [circuits]

    job= simulator.run(circuits, shots=shots,memory= True)
    result = job.result()

    finalstring=""
    
    for i in range(len(circuits)):
        bitstrings = result.get_memory(i)
        for bitstring in bitstrings:
            finalstring+= bitstring
    
    finalstring= finalstring.replace(" ", "")
    return finalstring

def rng(qubits):
    
    qc= QuantumCircuit(4,4)
    for i in range(4):
        qc.h(i)

    qc.measure_all()
    return measure(qc,qubits//4)

def makecircuits(totalcircuitscount,paircounts, Alicebasis,Bobbasis):
    circuits=[]
    for i in range(totalcircuitscount):
        qc= QuantumCircuit(paircounts*2,paircounts*2)
        for j in range(paircounts):
             basisindex=i*paircounts+j

             qc.h(j*2)
             qc.cx(j*2,j*2+1)

             if Alicebasis[basisindex]=='1' :
                 qc.h(j*2)
             if Bobbasis[basisindex]=='1':
                 qc.h(j*2+1)

        qc.measure_all()
        circuits.append(qc)

    transpiled_circuits = transpile(circuits, AerSimulator())
    measuredstring= measure(transpiled_circuits,1)

    return measuredstring

def extract_keys(measuredstring):
    """Extract Alice and Bob keys from measured string"""
    alicekey = ""
    bobkey = ""
    
    for i in range(len(measuredstring)):
        if i % 2 == 0:
            alicekey += measuredstring[i]
        else:
            bobkey += measuredstring[i]
    
    return alicekey, bobkey

def filter_keys_by_basis(alicekey, bobkey, Alicebasis, Bobbasis):
    """Remove bits where basis isn't the same from keys"""
    finalbasis = ""
    filtered_alicekey = ""
    filtered_bobkey = ""
    
    for i in range(len(Alicebasis)):
        if Alicebasis[i] == Bobbasis[i]:
            filtered_alicekey += alicekey[i]
            filtered_bobkey += bobkey[i]
            finalbasis += Alicebasis[i]
    
    return filtered_alicekey, filtered_bobkey, finalbasis

def test_subset(final_alicekey, final_bobkey, finalbasis):
    import random
    while len(finalbasis)> 1024:
        index= random.choice(finalbasis)

        if final_alicekey[index]== final_bobkey[index]:
            final_alicekey= final_alicekey[:index]+ final_alicekey[index+1:]   
            final_bobkey= final_bobkey[:index]+ final_bobkey[index+1:]
        else:
            print("[ABORT] ERROR IN KEY GENERATION")

def main():

    textsizelimit= 1024
    message= "HEY BRO HALOOOO"

    qubitpairs= textsizelimit *4
    paircounts=4

    Alicebasis= rng(qubitpairs)
    Bobbasis= rng(qubitpairs)

    # 0 2 4 6 Alice , 1 3 5 7 BOB ... Even Alice, Odd bob
    totalcircuitscount= qubitpairs// paircounts
    
    measuredstring=makecircuits(totalcircuitscount,paircounts, Alicebasis,Bobbasis)
    
    # Extract initial keys
    alicekey, bobkey = extract_keys(measuredstring)
    


    # Filter keys based on matching basis
    #final_alicekey, final_bobkey, finalbasis = filter_keys_by_basis(alicekey, bobkey, Alicebasis, Bobbasis)
    

    #final_alicekey,final_bobkey,finalbasis= test_subset(final_alicekey, final_bobkey, finalbasis)


if __name__== '__main__':
    main()
